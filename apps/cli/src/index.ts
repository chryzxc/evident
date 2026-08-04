import { Command } from 'commander';
import pc from 'picocolors';
import { createScanCommand } from './commands/scan.js';
import { createDoctorCommand } from './commands/doctor.js';
import { createInitCommand } from './commands/init.js';
import { createBaselineCommand } from './commands/baseline.js';
import { createDiffCommand } from './commands/diff.js';
import { createEvidenceCommand } from './commands/evidence.js';

const program = new Command();

program.name('evident').description('Developer-first repository intelligence and evidence orchestration').version('0.1.0');

program.addCommand(createScanCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createInitCommand());
program.addCommand(createBaselineCommand());
program.addCommand(createDiffCommand());
program.addCommand(createEvidenceCommand());

program.exitOverride();

function isEvidentError(err: unknown): err is Error & { exitCode: number } {
  return (
    err instanceof Error &&
    'exitCode' in err &&
    typeof (err as Error & { exitCode: unknown }).exitCode === 'number'
  );
}

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err: unknown) {
    if (isEvidentError(err)) {
      console.error(pc.red(err.message));
      process.exit(err.exitCode);
    }
    if (err instanceof Error && 'exitCode' in err) {
      const code = (err as { exitCode: unknown }).exitCode;
      process.exit(typeof code === 'number' ? code : 1);
    }
    console.error(pc.red(err instanceof Error ? err.message : String(err)));
    process.exit(5);
  }
}

void main();
