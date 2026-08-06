import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NormalizedFinding } from '@evident/types';
import { listFiles, type RepositoryContext } from '@evident/repository';
import type { Rule } from './types.js';

const now = () => new Date().toISOString();

function finding(
  id: string,
  title: string,
  description: string,
  path: string,
  category: NormalizedFinding['category'],
  severity: NormalizedFinding['severity'] = 'LOW',
  lineStart?: number,
): NormalizedFinding {
  return {
    id,
    fingerprint: `rule:${id}`,
    title,
    description,
    category,
    severity,
    confidence: 'HIGH',
    status: 'OPEN',
    sources: [{ tool: 'evident-rules', detectedAt: now() }],
    locations: [{ path, lineStart }],
    identifiers: [{ type: 'RULE', value: id }],
    mappings: [],
    evidence: [],
    firstSeenAt: now(),
    lastSeenAt: now(),
  };
}

function fileExists(repo: RepositoryContext, path: string): boolean {
  return existsSync(join(repo.root, path));
}

function readWorkflow(repo: RepositoryContext, relativePath: string): string | undefined {
  try {
    return readFileSync(join(repo.root, relativePath), 'utf8');
  } catch {
    return undefined;
  }
}

function hasWorkflowStep(
  content: string,
  needle: string | RegExp,
): boolean {
  return typeof needle === 'string'
    ? content.includes(needle)
    : needle.test(content);
}

export const governanceRules: Rule[] = [
  {
    id: 'repo-sec-md',
    category: 'OTHER',
    async run(repo) {
      if (fileExists(repo, 'SECURITY.md')) return [];
      return [
        finding(
          'repo-sec-md',
          'Missing SECURITY.md',
          'No security policy file found in repository root.',
          'SECURITY.md',
          'OTHER',
          'LOW',
        ),
      ];
    },
  },
  {
    id: 'repo-codeowners',
    category: 'OTHER',
    async run(repo) {
      if (fileExists(repo, 'CODEOWNERS') || fileExists(repo, '.github/CODEOWNERS')) return [];
      return [
        finding(
          'repo-codeowners',
          'Missing CODEOWNERS',
          'No CODEOWNERS file found.',
          'CODEOWNERS',
          'OTHER',
          'LOW',
        ),
      ];
    },
  },
  {
    id: 'repo-lockfiles',
    category: 'CI_CD',
    async run(repo) {
      const hasLockfile =
        fileExists(repo, 'pnpm-lock.yaml') ||
        fileExists(repo, 'yarn.lock') ||
        fileExists(repo, 'package-lock.json');
      if (hasLockfile) return [];
      return [
        finding(
          'repo-lockfiles',
          'No lockfile committed',
          'Repository lacks a package manager lockfile, making builds non-deterministic.',
          'package.json',
          'CI_CD',
          'MEDIUM',
        ),
      ];
    },
  },
];

export const cicdRules: Rule[] = [
  {
    id: 'ci-workflow-exists',
    category: 'CI_CD',
    async run(repo) {
      if (repo.workflows.length > 0) return [];
      return [
        finding(
          'ci-workflow-exists',
          'No CI workflow detected',
          'No GitHub Actions workflow files found in .github/workflows/.',
          '.github/workflows/',
          'CI_CD',
          'MEDIUM',
        ),
      ];
    },
  },
  {
    id: 'ci-test-step',
    category: 'CI_CD',
    async run(repo) {
      const missing: string[] = [];
      for (const wfPath of repo.workflows) {
        const content = readWorkflow(repo, wfPath);
        if (!content) continue;
        if (
          !hasWorkflowStep(content, /run:\s*(.*(vitest|jest|mocha|ava|test|npx test|npm test|npx jest|npx vitest))/)
        ) {
          missing.push(wfPath);
        }
      }
      if (missing.length === 0 && repo.workflows.length > 0) return [];
      return missing.map((path) =>
        finding(
          'ci-test-step',
          'Workflow may be missing test step',
          `The workflow ${path} does not appear to run tests.`,
          path,
          'CI_CD',
          'LOW',
        ),
      );
    },
  },
  {
    id: 'ci-build-lint-step',
    category: 'CI_CD',
    async run(repo) {
      const missing: string[] = [];
      for (const wfPath of repo.workflows) {
        const content = readWorkflow(repo, wfPath);
        if (!content) continue;
        if (!hasWorkflowStep(content, /run:\s*(.*(build|lint|typecheck|eslint|tsc))/)) {
          missing.push(wfPath);
        }
      }
      if (missing.length === 0 && repo.workflows.length > 0) return [];
      return missing.map((path) =>
        finding(
          'ci-build-lint-step',
          'Workflow may be missing build or lint step',
          `The workflow ${path} does not appear to include a build or lint check.`,
          path,
          'CI_CD',
          'LOW',
        ),
      );
    },
  },
  {
    id: 'ci-dependabot',
    category: 'CI_CD',
    async run(repo) {
      if (fileExists(repo, '.github/dependabot.yml') || fileExists(repo, '.github/dependabot.yaml'))
        return [];
      return [
        finding(
          'ci-dependabot',
          'Missing Dependabot configuration',
          '.github/dependabot.yml not found.',
          '.github/dependabot.yml',
          'CI_CD',
          'LOW',
        ),
      ];
    },
  },
  {
    id: 'ci-secret-scanning',
    category: 'CI_CD',
    async run(repo) {
      let found = false;
      for (const wfPath of repo.workflows) {
        const content = readWorkflow(repo, wfPath);
        if (!content) continue;
        if (hasWorkflowStep(content, /trufflehog|secret.scan|gitleaks|detect-secrets/)) {
          found = true;
          break;
        }
      }
      if (found) return [];
      return [
        finding(
          'ci-secret-scanning',
          'No secret scanning in CI',
          'No workflow step runs secret scanning (trufflehog, gitleaks, etc.).',
          '.github/workflows/',
          'CI_CD',
          'MEDIUM',
        ),
      ];
    },
  },
];

export const applicationSecurityRules: Rule[] = [
  {
    id: 'app-hardcoded-credential',
    category: 'SECRET',
    async run(repo) {
      const matches = await sourceMatches(
        repo,
        /(?:api[_-]?key|client[_-]?secret|password|access[_-]?token|secret)\s*[:=]\s*['"]([^'"\\\n]{8,})['"]/gi,
      );
      return matches.map((match) =>
        finding(
          'app-hardcoded-credential',
          'Potential hardcoded credential',
          'A credential-like identifier is assigned a literal value instead of reading from a secure configuration source.',
          match.path,
          'SECRET',
          'HIGH',
          match.lineStart,
        ),
      );
    },
  },
  {
    id: 'app-unsafe-jwt-decode',
    category: 'AUTHENTICATION',
    async run(repo) {
      const matches = await sourceMatches(repo, /\bjwt\.decode\s*\(/g);
      return matches.map((match) =>
        finding(
          'app-unsafe-jwt-decode',
          'JWT decoded without verification',
          'jwt.decode() does not validate a token signature. Use jwt.verify() before trusting claims.',
          match.path,
          'AUTHENTICATION',
          'HIGH',
          match.lineStart,
        ),
      );
    },
  },
  {
    id: 'app-sensitive-logging',
    category: 'AUDIT_LOGGING',
    async run(repo) {
      const matches = await sourceMatches(
        repo,
        /(?:console|logger|log)\.(?:log|info|debug|warn|error)\s*\([^\n]*(?:password|token|authorization|ssn|phi)/gi,
      );
      return matches.map((match) =>
        finding(
          'app-sensitive-logging',
          'Sensitive value may be logged',
          'A logging call references a password, token, authorization value, SSN, or PHI identifier.',
          match.path,
          'AUDIT_LOGGING',
          'HIGH',
          match.lineStart,
        ),
      );
    },
  },
  {
    id: 'app-unguarded-sensitive-route',
    category: 'AUTHORIZATION',
    async run(repo) {
      const matches = await sourceMatches(
        repo,
        /(?:app|router)\.(?:get|post|put|patch|delete)\s*\(\s*['"]\/(?:admin|export|patients?)[^'"]*['"][^\n]*/gi,
      );
      return matches
        .filter((match) => !/auth|authorize|permission|role|scope/i.test(match.line))
        .map((match) =>
          finding(
            'app-unguarded-sensitive-route',
            'Sensitive route may lack authorization middleware',
            'An admin, export, or patient route has no visible authorization middleware on its registration line.',
            match.path,
            'AUTHORIZATION',
            'MEDIUM',
            match.lineStart,
          ),
        );
    },
  },
];

async function sourceMatches(
  repo: RepositoryContext,
  pattern: RegExp,
): Promise<Array<{ path: string; line: string; lineStart: number }>> {
  const files = await listFiles({
    cwd: repo.root,
    include: ['**/*.{js,cjs,mjs,ts,cts,mts,jsx,tsx}'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/fixtures/**'],
  });
  const matches: Array<{ path: string; line: string; lineStart: number }> = [];

  for (const path of files) {
    const content = readWorkflow(repo, path);
    if (!content) continue;
    for (const [index, line] of content.split('\n').entries()) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) matches.push({ path, line, lineStart: index + 1 });
    }
  }

  return matches;
}
