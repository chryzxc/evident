import { Command } from 'commander';
import pc from 'picocolors';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectRepository } from '@evident/repository';
import { handleError } from './errors.js';

const DEFAULT_CONFIG = `# Evident configuration
version: 1

project:
  name: __PROJECT_NAME__
  type: application

profiles:
  - security

scanners:
  npmAudit:
    enabled: true

  semgrep:
    enabled: true
    config:
      - p/owasp-top-ten

  trivy:
    enabled: true
    scanners:
      - vuln
      - misconfig
      - secret

  trufflehog:
    enabled: true
    verifiedOnly: true

scan:
  exclude:
    - node_modules/**
    - dist/**
    - build/**
    - coverage/**
    - .git/**

policy:
  failOn:
    severity:
      - high
      - critical

privacy:
  sendSourceToAI: false
  redactSecrets: true
  redactIdentifiers: true

reporting:
  formats:
    - terminal
    - json
  outputDirectory: .evident/reports
`;

const DEFAULT_IGNORE = `# Evident ignore patterns
# Add globs to exclude from scanning.
# These are additive to the built-in ignores (node_modules, dist, .git, etc.).
`;

export function createInitCommand(): Command {
  const cmd = new Command('init').description('Initialize Evident in the current repository').action(async () => {
    try {
      const cwd = process.cwd();
      const repo = await detectRepository({ root: cwd });

      const configContent = DEFAULT_CONFIG.replace('__PROJECT_NAME__', repo.name);

      const configPath = join(cwd, 'evident.config.yaml');
      const ignorePath = join(cwd, '.evidentignore');

      await writeFile(configPath, configContent, 'utf8');
      await writeFile(ignorePath, DEFAULT_IGNORE, 'utf8');

      process.stdout.write(pc.green('Evident initialized.\n'));
      process.stdout.write(`  Config: ${configPath}\n`);
      process.stdout.write(`  Ignore: ${ignorePath}\n`);
      process.stdout.write(`\n  Detected: ${repo.languages.join(', ') || 'none'} | ${repo.frameworks.join(', ') || 'no framework'}\n`);
      process.stdout.write(`  Next: run ${pc.bold('npx evident scan')}\n`);

      process.exit(0);
    } catch (err) {
      handleError(err);
    }
  });

  return cmd;
}
