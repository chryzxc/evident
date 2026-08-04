import { Command } from 'commander';
import { terminalReporter } from '@evident/reporters';
import type { ScanOptions } from '@evident/types';
import { split } from './options.js';
import { handleError } from './errors.js';
import { runConfiguredScan } from './run-scan.js';

export function createScanCommand(): Command {
  const cmd = new Command('scan')
    .description('Run a repository intelligence scan')
    .option('--profile <profiles>', 'Profiles to activate', split)
    .option('--framework <frameworks>', 'Compliance frameworks to map against', split)
    .option('--scanner <scanners>', 'External scanners to run', split)
    .option('--format <formats>', 'Report formats', split)
    .option('--output <dir>', 'Report output directory', '.evident/reports')
    .option('--fail-on <severities>', 'Blocking severity level', split)
    .option('--diff', 'Compute diff against a base')
    .option('--base <ref>', 'Baseline git ref for diff mode')
    .option('--new-only', 'Only fail for findings absent from a baseline')
    .option('--no-ai', 'Disable AI explanations')
    .option('--offline', 'Disable network access')
    .option('--changed-only', 'Only scan changed files')
    .option('--timeout <seconds>', 'Per-tool timeout in seconds', parseInt)
    .option('--native-only', 'Only run Evident-native rules (no external scanners)')
    .option('--ci', 'CI mode (no interactive prompts)')
    .option('--verbose', 'Verbose output')
    .option('--quiet', 'Quiet output')
    .action(async (opts) => {
      try {
        const options: ScanOptions = {
          root: process.cwd(),
          profiles: opts.profile,
          frameworks: opts.framework,
          scanners: opts.scanner,
          formats: opts.format,
          outputDirectory: opts.output,
          failOn: opts.failOn
            ? { severity: opts.failOn, newFindingsOnly: Boolean(opts.diff || opts.newOnly) }
            : undefined,
          base: opts.base,
          ci: opts.ci,
          offline: opts.offline,
          useAi: opts.ai !== false,
          timeout: opts.timeout ? opts.timeout * 1000 : undefined,
          logLevel: opts.quiet ? 'silent' : opts.verbose ? 'debug' : 'info',
        };

        if (opts.nativeOnly) options.mode = 'native-only';
        if (opts.changedOnly) options.mode = 'changed-only';

        const result = await runConfiguredScan(options);

        const terminal = terminalReporter.render(result);
        process.stdout.write(terminal + '\n');

        process.exit(result.exitCode);
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}
