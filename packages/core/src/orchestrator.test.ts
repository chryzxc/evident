import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { EvidentFinding } from '@evident/types';
import { scanRepository } from './orchestrator.js';

const execFile = promisify(execFileCallback);
let fixture: string;

beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'evident-core-'));
  await mkdir(join(fixture, 'src'), { recursive: true });
  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({ name: 'core-demo', dependencies: { express: '^4.18.0' } }),
  );
  await writeFile(join(fixture, 'tsconfig.json'), '{}');
  await execFile('git', ['init', '-q', '-b', 'main'], { cwd: fixture });
  await execFile('git', ['config', 'user.email', 'test@example.com'], { cwd: fixture });
  await execFile('git', ['config', 'user.name', 'Evident Test'], { cwd: fixture });
  await execFile('git', ['add', '.'], { cwd: fixture });
  await execFile('git', ['commit', '-qm', 'initial'], { cwd: fixture });
});

afterAll(async () => {
  await rm(fixture, { recursive: true, force: true });
});

describe('scanRepository (native-only)', () => {
  it('produces a valid scan result with detected repo', async () => {
    const result = await scanRepository({
      root: fixture,
      mode: 'native-only',
      formats: ['terminal', 'json'],
      outputDirectory: join(fixture, '.evident', 'reports'),
      logLevel: 'silent',
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.repository.name).toBe('core-demo');
    expect(result.repository.languages).toContain('TypeScript');
    expect(result.repository.frameworks).toContain('Express');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.id === 'repo-sec-md')).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('writes a json report', async () => {
    const out = join(fixture, '.evident', 'reports');
    const result = await scanRepository({
      root: fixture,
      mode: 'native-only',
      formats: ['json'],
      outputDirectory: out,
      logLevel: 'silent',
    });
    expect(result.exitCode).toBe(0);
    const { readFile } = await import('node:fs/promises');
    const written = JSON.parse(await readFile(join(out, 'report.json'), 'utf8'));
    expect(written.repository.name).toBe('core-demo');
  });

  it('evaluates a requested framework', async () => {
    const result = await scanRepository({
      root: fixture,
      mode: 'native-only',
      frameworks: ['soc2'],
      logLevel: 'silent',
    });

    expect(result.controls.length).toBeGreaterThan(0);
    expect(result.controls.every((control) => control.framework === 'soc2')).toBe(true);
  });

  it('keeps only findings located in files changed from the base ref', async () => {
    await writeFile(join(fixture, 'src', 'changed.ts'), 'export const changed = true;\n');
    await execFile('git', ['add', 'src/changed.ts'], { cwd: fixture });
    await execFile('git', ['commit', '-qm', 'changed source'], { cwd: fixture });

    const result = await scanRepository({
      root: fixture,
      mode: 'changed-only',
      base: 'HEAD~1',
      logLevel: 'silent',
    }, {
      runAdapters: async () => ({
        adapterRuns: [],
        findings: [
          findingAt('changed', 'src/changed.ts'),
          findingAt('unchanged', 'tsconfig.json'),
          findingAt('unlocated'),
        ],
      }),
      runNativeRules: async () => [],
    });

    expect(result.findings.map((finding) => finding.id)).toEqual(['changed']);
  });
});

function findingAt(id: string, path?: string): EvidentFinding {
  return {
    id,
    fingerprint: id,
    title: id,
    description: id,
    category: 'SECURITY_CONFIGURATION',
    severity: 'LOW',
    confidence: 'HIGH',
    status: 'OPEN',
    sources: [],
    locations: path ? [{ path }] : [],
    identifiers: [],
    mappings: [],
    evidence: [],
    firstSeenAt: '',
    lastSeenAt: '',
  };
}
