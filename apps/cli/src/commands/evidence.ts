import { Command } from 'commander';
import { handleError } from './errors.js';
import { runConfiguredScan } from './run-scan.js';

export function createEvidenceCommand(): Command {
  return new Command('evidence')
    .description('Discover technical evidence and evaluate framework control mappings')
    .option('--framework <framework>', 'Framework to evaluate', 'soc2')
    .option('--format <format>', 'Output format: terminal or json', 'terminal')
    .option('--native-only', 'Only run Evident-native rules')
    .action(async (options) => {
      try {
        const result = await runConfiguredScan({
          root: process.cwd(),
          frameworks: [options.framework],
          mode: options.nativeOnly ? 'native-only' : 'full',
          formats: ['json'],
        });

        if (options.format === 'json') {
          process.stdout.write(
            `${JSON.stringify({
              framework: options.framework,
              controls: result.controls,
              evidence: result.evidence,
              findings: result.findings,
              limitations: [
                'This is a technical evidence evaluation, not a compliance certification.',
              ],
            }, null, 2)}\n`,
          );
        } else {
          process.stdout.write(`Evident Technical Evidence: ${options.framework.toUpperCase()}\n\n`);
          for (const control of result.controls) {
            process.stdout.write(`${control.controlId} ${control.controlTitle}\n`);
            process.stdout.write(`  Status: ${control.status}\n`);
            if (control.evidenceIds.length > 0) {
              const items = result.evidence.filter((item) => control.evidenceIds.includes(item.id));
              process.stdout.write(`  Evidence: ${items.map((item) => item.path ?? item.title).join(', ')}\n`);
            }
            if (control.findingIds.length > 0) {
              const items = result.findings.filter((item) => control.findingIds.includes(item.id));
              process.stdout.write(`  Technical gaps: ${items.map((item) => item.title).join(', ')}\n`);
            }
            if (control.limitations.length > 0) {
              process.stdout.write(`  Limitations: ${control.limitations.join(' ')}\n`);
            }
            process.stdout.write('\n');
          }
          process.stdout.write('Technical evidence only. This is not a compliance certification.\n');
        }

        process.exit(result.exitCode);
      } catch (error) {
        handleError(error);
      }
    });
}
