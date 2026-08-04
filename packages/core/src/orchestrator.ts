import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadConfig } from '@evident/config';
import { detectRepository, type RepositoryContext } from '@evident/repository';
import type { AdapterContext, AdapterRunResult } from '@evident/adapters';
import type {
  AdapterRun,
  EvidentFinding,
  ScanOptions,
  ScanResult,
} from '@evident/types';
import type { RegressionItem } from '@evident/types';
import { deduplicate } from '@evident/deduplicator';
import { governanceRules, cicdRules, runRules } from '@evident/rules';
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
    return runRules(ctx.repository, [...governanceRules, ...cicdRules]);
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

  if (options.profiles) config = { ...config, profiles: options.profiles };
  if (options.formats) {
    config = {
      ...config,
      reporting: { ...config.reporting, formats: options.formats as never },
    };
  }
  if (options.outputDirectory) {
    config = {
      ...config,
      reporting: { ...config.reporting, outputDirectory: options.outputDirectory },
    };
  }
  if (options.failOn) {
    config = {
      ...config,
      policy: { ...config.policy, failOn: { ...config.policy.failOn, ...options.failOn } },
    };
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

  logger.info(`Detected ${repository.name}: ${repository.languages.join('/') || 'unknown'}, ${repository.frameworks.join('/') || 'no framework'}`);

  const adapterCtx: AdapterContext = {
    root: resolve(options.root),
    repository,
    config,
    offline: options.offline ?? false,
    timeout: options.timeout,
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

  const deduped = deduplicate(findings);
  findings = deduped.map((g) => g.primary);

  const missingTools = adapters
    .filter((a) => a.status === 'unavailable')
    .map((a) => a.id);
  const coverage: ScanResult['coverage'] = {
    complete: missingTools.length === 0 && !adapters.some((a) => a.status === 'failed' || a.status === 'timed_out'),
    partial: missingTools.length > 0,
    missingTools,
  };

  const evidence = await discoverEvidence(repository);
  const controls = config.frameworks.flatMap((fw) =>
    evaluateControls(
      findings.map((f) => f.id),
      fw,
    ),
  );

  let regression = [] as RegressionItem[];
  if (options.base) {
    const baseline = await loadBaseline('.evident');
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
      logger.warn(`Failed to write ${format} report: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export { computeExitCode, EXIT } from './exit-code.js';
export { ExitCodeError } from './errors.js';
export { createLogger, type Logger } from './logger.js';
export type { ScanContext } from './context.js';
