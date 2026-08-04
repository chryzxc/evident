import { Command } from 'commander';
import pc from 'picocolors';
import { detectRepository } from '@evident/repository';
import { handleError } from './errors.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function checkWhich(binary: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('which', [binary], { timeout: 5000 });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function createDoctorCommand(): Command {
  const cmd = new Command('doctor').description('Check the environment for Evident compatibility').action(async () => {
    try {
      const results: { name: string; status: string; detail: string }[] = [];

      const nodeVersion = process.version;
      const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10);
      const nodeOk = nodeMajor >= 20;
      results.push({
        name: 'Node.js',
        status: nodeOk ? 'OK' : 'WARNING',
        detail: nodeOk ? nodeVersion : `${nodeVersion} (>=20 required)`,
      });

      const gitPath = await checkWhich('git');
      results.push({
        name: 'Git',
        status: gitPath ? 'OK' : 'WARNING',
        detail: gitPath ?? 'not found',
      });

      const npmPath = await checkWhich('npm');
      results.push({
        name: 'npm',
        status: npmPath ? 'OK' : 'WARNING',
        detail: npmPath ?? 'not found',
      });

      for (const tool of ['semgrep', 'trivy', 'trufflehog']) {
        const path = await checkWhich(tool);
        results.push({
          name: tool,
          status: path ? 'OK' : 'NOT FOUND',
          detail: path ?? 'not installed',
        });
      }

      const dockerPath = await checkWhich('docker');
      results.push({
        name: 'Docker',
        status: dockerPath ? 'OK' : 'NOT FOUND',
        detail: dockerPath ?? 'not installed',
      });

      try {
        const repo = await detectRepository({ root: process.cwd() });
        results.push({
          name: 'Repository detection',
          status: 'OK',
          detail: `${repo.name} (${repo.languages.join(', ') || 'none'})`,
        });
      } catch (e) {
        results.push({
          name: 'Repository detection',
          status: 'FAILED',
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      process.stdout.write(pc.bold('Evident Environment Check\n'));
      process.stdout.write(`Node: ${nodeVersion}\n\n`);
      for (const r of results) {
        const symbol =
          r.status === 'OK' ? pc.green('✓') : r.status.includes('FAIL') ? pc.red('✗') : pc.yellow('!');
        process.stdout.write(`  ${symbol} ${pc.bold(r.name)}${r.detail ? pc.dim(` — ${r.detail}`) : ''}\n`);
      }

      process.exit(0);
    } catch (err) {
      handleError(err);
    }
  });

  return cmd;
}
