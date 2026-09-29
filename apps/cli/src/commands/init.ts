import { Command } from 'commander';
import pc from 'picocolors';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringifyConfigYaml } from '@evident/config';
import { detectRepository } from '@evident/repository';
import { handleError } from './errors.js';

function defaultConfig(projectName: string): Record<string, unknown> {
  return {
    version: 1,
    project: { name: projectName, type: 'application' },
    profiles: ['security'],
    scanners: {
      npmAudit: { enabled: true },
      semgrep: { enabled: true, config: ['p/owasp-top-ten'] },
      trivy: { enabled: true, scanners: ['vuln', 'misconfig', 'secret'] },
      trufflehog: { enabled: true, verifiedOnly: true },
    },
    scan: { exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'] },
    policy: { failOn: { severity: ['high', 'critical'] } },
    privacy: { sendSourceToAI: false, redactSecrets: true, redactIdentifiers: true },
    reporting: { formats: ['terminal', 'json'], outputDirectory: '.evident/reports' },
  };
}

const DEFAULT_IGNORE = `# Evident ignore patterns
# Add globs to exclude from scanning.
# These are additive to the built-in ignores (node_modules, dist, .git, etc.).
`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function createInitCommand(): Command {
  const cmd = new Command('init')
    .description('Initialize Evident in the current repository')
    .option('--force', 'Overwrite an existing Evident config or ignore file')
    .action(async (options: { force?: boolean }) => {
      try {
        const cwd = process.cwd();
        const repo = await detectRepository({ root: cwd });

        const configContent = stringifyConfigYaml(defaultConfig(repo.name));

        const configPath = join(cwd, 'evident.config.yaml');
        const ignorePath = join(cwd, '.evidentignore');

        if (!options.force) {
          const existingPaths = (
            await Promise.all(
              [configPath, ignorePath].map(async (path) =>
                (await exists(path)) ? path : undefined,
              ),
            )
          ).filter((path): path is string => path !== undefined);

          if (existingPaths.length > 0) {
            throw new Error(
              `Refusing to overwrite ${existingPaths.join(', ')}. Re-run with --force to overwrite existing files.`,
            );
          }
        }

        const flag = options.force ? 'w' : 'wx';
        await writeFile(configPath, configContent, { encoding: 'utf8', flag });
        await writeFile(ignorePath, DEFAULT_IGNORE, { encoding: 'utf8', flag });

        process.stdout.write(pc.green('Evident initialized.\n'));
        process.stdout.write(`  Config: ${configPath}\n`);
        process.stdout.write(`  Ignore: ${ignorePath}\n`);
        process.stdout.write(
          `\n  Detected: ${repo.languages.join(', ') || 'none'} | ${repo.frameworks.join(', ') || 'no framework'}\n`,
        );
        process.stdout.write(`  Next: run ${pc.bold('npx @evident/cli scan')}\n`);

        process.exit(0);
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}
