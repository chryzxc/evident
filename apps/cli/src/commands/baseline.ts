import { Command } from 'commander';
import { createBaseline } from '@evident/regression';
import { terminalReporter } from '@evident/reporters';
import { join } from 'node:path';
import { handleError } from './errors.js';
import { runConfiguredScan } from './run-scan.js';

export function createBaselineCommand(): Command {
  const baseline = new Command('baseline').description('Create and compare local finding baselines');

  baseline
    .command('create')
    .description('Create a fingerprint-only baseline from the current scan')
    .option('--native-only', 'Only run Evident-native rules')
    .action(async (options) => {
      try {
        const root = process.cwd();
        const result = await runConfiguredScan({
          root,
          mode: options.nativeOnly ? 'native-only' : 'full',
          formats: ['json'],
          outputDirectory: join(root, '.evident', 'reports'),
        });
        await createBaseline(result, join(root, '.evident'));
        process.stdout.write('Created .evident/baseline.json\n');
        process.stdout.write(`${terminalReporter.render(result)}\n`);
        process.exit(result.exitCode);
      } catch (error) {
        handleError(error);
      }
    });

  baseline
    .command('compare')
    .description('Compare the current scan with .evident/baseline.json')
    .option('--native-only', 'Only run Evident-native rules')
    .action(async (options) => {
      try {
        const result = await runConfiguredScan({
          root: process.cwd(),
          base: 'local',
          mode: options.nativeOnly ? 'native-only' : 'full',
          formats: ['terminal', 'json', 'html', 'sarif'],
        });
        process.stdout.write(`${terminalReporter.render(result)}\n`);
        process.exit(result.exitCode);
      } catch (error) {
        handleError(error);
      }
    });

  return baseline;
}
