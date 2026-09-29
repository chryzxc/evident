import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadConfig, validateConfig } from '@evident/config';
import { detectRepository, getChangedFiles, type RepositoryContext } from '@evident/repository';
import type { AdapterContext, AdapterRunResult } from '@evident/adapters';
import type { AdapterRun, EvidentFinding, ScanOptions, ScanResult } from '@evident/types';
import type { RegressionItem } from '@evident/types';
import { deduplicate } from '@evident/deduplicator';
import { governanceRules, cicdRules, applicationSecurityRules, runRules } from '@evident/rules';
import { discoverEvidence } from '@evident/evidence';
import { evaluateControls } from '@evident/controls';
import { loadBaseline, classifyFindings } from '@evident/regression';
import { ExitCodeError } from './errors.js';
import { computeExitCode, EXIT } from './exit-code.js';
import { createLogger, type Logger } from './logger.js';
import { buildScanResult, toRepositorySummary } from './result.js';
import { htmlReporter, sarifReporter } from '@evident/reporters';

export interface ScanHooks {
  runAdapters?: (ctx: AdapterContext) => Promise<AdapterRunResult>;
  runNativeRules?: (ctx: AdapterContext) => Promise<EvidentFinding[]>;
}

export const DEFAULT_HOOKS: ScanHooks = {
  runAdapters: async () => ({ adapterRuns: [], findings: [] }),
  runNativeRules: async (ctx) => {
    return runRules(ctx.repository, [
      ...governanceRules,
      ...cicdRules,
      ...applicationSecurityRules,
    ]);
  },
};

/**
 * Top-level repository scan. Implements the full lifecycle from `plan.md`
 * §packages/core. Phase-specific stages (adapters, dedup, rules, controls,
 * evidence, regression) are injected via hooks and default to no-ops until
 * their phase is implemented.
 */
export async function scanRepository(
  options: ScanOptions,
  hooks: ScanHooks = DEFAULT_HOOKS,
): Promise<ScanResult> {
  const logger = createLogger(options.logLevel ?? 'info');
  const startedAt = Date.now();

  let config = await loadConfig({
    cwd: options.root,
    configPath: options.configPath,
    overrides: options.configOverrides,
  });

  if (options.profiles) config = validateConfig({ ...config, profiles: options.profiles });
  if (options.frameworks) config = validateConfig({ ...config, frameworks: options.frameworks });
  if (!options.frameworks) {
    const profileFrameworks = config.profiles.filter(
      (profile): profile is 'soc2' => profile === 'soc2',
    );
    if (profileFrameworks.length > 0) {
      config = validateConfig({
        ...config,
        frameworks: [...new Set([...config.frameworks, ...profileFrameworks])],
      });
    }
  }
  if (options.formats) {
    config = validateConfig({
      ...config,
      reporting: { ...config.reporting, formats: options.formats },
    });
  }
  if (options.outputDirectory) {
    config = validateConfig({
      ...config,
      reporting: { ...config.reporting, outputDirectory: options.outputDirectory },
    });
  }
  if (options.failOn) {
    config = validateConfig({
      ...config,
      policy: { ...config.policy, failOn: { ...config.policy.failOn, ...options.failOn } },
    });
  }

  let repository: RepositoryContext;
  try {
    repository = await detectRepository({ root: resolve(options.root) });
  } catch (err) {
    throw new ExitCodeError(
      `Repository detection failed: ${err instanceof Error ? err.message : String(err)}`,
      EXIT.INTERNAL_ERROR,
      err,
    );
  }

  logger.info(
    `Detected ${repository.name}: ${repository.languages.join('/') || 'unknown'}, ${repository.frameworks.join('/') || 'no framework'}`,
  );

  const changedOnly = options.changedOnly || options.mode === 'changed-only';
  let changedFiles: string[] | undefined;
  if (changedOnly) {
    try {
      changedFiles = await getChangedFiles(repository.root, options.base);
    } catch (err) {
      throw new ExitCodeError(
        `Cannot determine changed files against '${options.base ?? 'HEAD~1'}': ${err instanceof Error ? err.message : String(err)}`,
        EXIT.INVALID_CONFIG,
        err,
      );
    }
  }
  if (changedOnly) {
    logger.info(`Changed-file scope: ${changedFiles?.length ?? 0} files`);
  }

  const adapterCtx: AdapterContext = {
    root: resolve(options.root),
    repository,
    config,
    offline: options.offline ?? false,
    timeout: options.timeout,
    changedFiles,
  };

  const runAdapters = hooks.runAdapters ?? DEFAULT_HOOKS.runAdapters!;
  const runNativeRules = hooks.runNativeRules ?? DEFAULT_HOOKS.runNativeRules!;

  let adapters: AdapterRun[] = [];
  let findings: EvidentFinding[] = [];

  try {
    const isNativeOnly = options.mode === 'native-only';
    if (!isNativeOnly) {
      const result = await runAdapters(adapterCtx);
      adapters = result.adapterRuns;
      findings = result.findings;
    }
    const nativeFindings = await runNativeRules(adapterCtx);
    findings = [...findings, ...nativeFindings];
  } catch (err) {
    throw new ExitCodeError(
      `Scan execution failed: ${err instanceof Error ? err.message : String(err)}`,
      EXIT.INTERNAL_ERROR,
      err,
    );
  }

  if (changedFiles) {
    findings = findings.filter((finding) =>
      finding.locations.some((location) =>
        changedFiles.some(
          (path) =>
            path === location.path || path.startsWith(`${location.path.replace(/\/$/, '')}/`),
        ),
      ),
    );
  }

  const deduped = deduplicate(findings);
  findings = deduped.map((g) => g.primary);

  const missingTools = adapters.filter((a) => a.status === 'unavailable').map((a) => a.id);
  const coverage: ScanResult['coverage'] = {
    complete:
      missingTools.length === 0 &&
      !adapters.some((a) => a.status === 'failed' || a.status === 'timed_out'),
    partial: missingTools.length > 0,
    missingTools,
  };

  const evidence = await discoverEvidence(repository);
  const controls = config.frameworks.flatMap((fw) => evaluateControls(findings, evidence, fw));

  let regression = [] as RegressionItem[];
  if (options.base || config.policy.failOn.newFindingsOnly) {
    const baseline = await loadBaseline(join(repository.root, '.evident'));
    if (!baseline && config.policy.failOn.newFindingsOnly) {
      throw new ExitCodeError(
        'New-findings-only policy needs a baseline: run `evident baseline create` first.',
        EXIT.INVALID_CONFIG,
      );
    }
    regression = classifyFindings(findings, baseline);
  }

  const exitCode = computeExitCode({
    result: { findings, regression },
    failOn: config.policy.failOn,
    adapters,
  });

  const result = buildScanResult({
    generatedAt: new Date().toISOString(),
    repository: toRepositorySummary(repository),
    profiles: config.profiles,
    frameworks: config.frameworks,
    findings,
    evidence,
    controls,
    adapters,
    regression,
    coverage,
    durationMs: Date.now() - startedAt,
    exitCode,
  });

  await writeReports(result, config.reporting.formats, config.reporting.outputDirectory, logger);

  return result;
}

async function writeReports(
  result: ScanResult,
  formats: string[],
  outputDirectory: string,
  logger: Logger,
): Promise<void> {
  const dir = resolve(outputDirectory);
  for (const format of formats) {
    if (format === 'terminal') continue;
    try {
      if (format === 'json') {
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'report.json'), JSON.stringify(result, null, 2), 'utf8');
        logger.info(`Wrote ${join(dir, 'report.json')}`);
      } else if (format === 'html') {
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'report.html'), htmlReporter.render(result), 'utf8');
        logger.info(`Wrote ${join(dir, 'report.html')}`);
      } else if (format === 'sarif') {
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'report.sarif'), sarifReporter.render(result), 'utf8');
        logger.info(`Wrote ${join(dir, 'report.sarif')}`);
      }
    } catch (err) {
      logger.warn(
        `Failed to write ${format} report: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export { computeExitCode, EXIT } from './exit-code.js';
export { ExitCodeError } from './errors.js';
export { createLogger, type Logger } from './logger.js';
export type { ScanContext } from './context.js';
