import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectRepository } from '@evident/repository';
import { runRules } from './engine.js';
import { applicationSecurityRules } from './rules.js';

describe('applicationSecurityRules', () => {
  it('reports direct credential, JWT, logging, and route risks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'evident-rules-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'package.json'), '{"name":"fixture"}');
      await writeFile(
        join(root, 'src', 'routes.ts'),
        [
          "const apiKey = 'production-key-value';",
          'jwt.decode(token);',
          'logger.info(token);',
          "router.get('/admin/users', listUsers);",
        ].join('\n'),
      );

      const repo = await detectRepository({ root });
      const findings = await runRules(repo, applicationSecurityRules);
      expect(findings.map((finding) => finding.id)).toEqual(
        expect.arrayContaining([
          'app-hardcoded-credential',
          'app-unsafe-jwt-decode',
          'app-sensitive-logging',
          'app-unguarded-sensitive-route',
        ]),
      );
      expect(
        findings.find((finding) => finding.id === 'app-unsafe-jwt-decode')?.locations[0]?.lineStart,
      ).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores patterns that only appear in comments or string literals', async () => {
    const root = await mkdtemp(join(tmpdir(), 'evident-rules-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'package.json'), '{"name":"fixture"}');
      await writeFile(
        join(root, 'src', 'docs.ts'),
        [
          "const message = 'jwt.decode() does not validate a token signature';",
          '// jwt.decode(token) is unsafe',
          ' * jwt.decode(token)',
        ].join('\n'),
      );
      const repo = await detectRepository({ root });
      const findings = await runRules(repo, applicationSecurityRules);
      expect(findings.map((finding) => finding.id)).not.toContain('app-unsafe-jwt-decode');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
