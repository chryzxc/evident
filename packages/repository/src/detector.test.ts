import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectRepository, jailPath, hashString } from './index.js';

let fixture: string;

beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'evident-repo-'));
  await mkdir(join(fixture, '.github/workflows'), { recursive: true });
  await mkdir(join(fixture, 'src'), { recursive: true });
  await mkdir(join(fixture, 'packages/web'), { recursive: true });

  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: 'demo-app',
      dependencies: { express: '^4.18.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      workspaces: ['packages/*'],
    }),
  );
  await writeFile(join(fixture, 'tsconfig.json'), '{}');
  await writeFile(join(fixture, 'pnpm-lock.yaml'), '');
  await writeFile(join(fixture, 'Dockerfile'), 'FROM node:20\n');
  await writeFile(join(fixture, '.github/workflows/ci.yml'), 'name: CI\non: [push]\n');
  await writeFile(join(fixture, 'packages/web/package.json'), JSON.stringify({ name: 'web' }));
});

afterAll(async () => {
  await rm(fixture, { recursive: true, force: true });
});

describe('detectRepository', () => {
  it('detects languages, package managers, and frameworks', async () => {
    const ctx = await detectRepository({ root: fixture });
    expect(ctx.name).toBe('demo-app');
    expect(ctx.languages).toContain('TypeScript');
    expect(ctx.packageManagers).toContain('npm');
    expect(ctx.packageManagers).toContain('pnpm');
    expect(ctx.frameworks).toEqual(expect.arrayContaining(['Express', 'React']));
    expect(ctx.hasTsconfig).toBe(true);
    expect(ctx.dockerFiles).toContain('Dockerfile');
  });

  it('detects monorepo workspaces', async () => {
    const ctx = await detectRepository({ root: fixture });
    expect(ctx.isMonorepo).toBe(true);
    expect(ctx.workspaces).toContain('packages/*');
    expect(ctx.packageJsons).toContain('packages/web/package.json');
  });

  it('finds github workflows', async () => {
    const ctx = await detectRepository({ root: fixture });
    expect(ctx.workflows).toContain('.github/workflows/ci.yml');
  });

  it('does not crash outside a git repo', async () => {
    const ctx = await detectRepository({ root: fixture });
    expect(ctx.git).toBeUndefined();
  });
});

describe('security: path jailing', () => {
  it('allows paths inside root', () => {
    expect(() => jailPath(fixture, 'src/index.ts')).not.toThrow();
  });

  it('rejects traversal escapes', () => {
    expect(() => jailPath(fixture, '../../etc/passwd')).toThrow(/Path traversal blocked/);
  });
});

describe('hashing', () => {
  it('produces a stable sha256', () => {
    expect(hashString('evident')).toBe(hashString('evident'));
    expect(hashString('evident')).toHaveLength(64);
  });
});
