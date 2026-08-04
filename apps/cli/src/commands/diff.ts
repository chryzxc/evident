import { Command } from 'commander';
import { terminalReporter } from '@evident/reporters';
import { handleError } from './errors.js';
import { runConfiguredScan } from './run-scan.js';

export function createDiffCommand(): Command {
  return new Command('diff')
    .description('Compare the current scan with the local baseline')
    .option('--base <ref>', 'Baseline reference label', 'local')
    .option('--native-only', 'Only run Evident-native rules')
    .option('--fail-on <severity>', 'Fail at or above a severity')
    .action(async (options) => {
      try {
        const result = await runConfiguredScan({
          root: process.cwd(),
          base: options.base,
          mode: options.nativeOnly ? 'native-only' : 'full',
          formats: ['terminal', 'json', 'html', 'sarif'],
          failOn: options.failOn
            ? { severity: [options.failOn], newFindingsOnly: true }
            : { severity: [], newFindingsOnly: true },
        });
        process.stdout.write(`${terminalReporter.render(result)}\n`);
        process.exit(result.exitCode);
      } catch (error) {
        handleError(error);
      }
    });
}
