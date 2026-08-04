import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './loader.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'evident-cfg-load-'));
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo' }));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadConfig from filesystem', () => {
  it('rejects an invalid version via yaml', async () => {
    await writeFile(join(dir, 'evident.config.yaml'), 'version: 2\n');
    await expect(loadConfig({ cwd: dir })).rejects.toThrow(/Invalid/);
  });

  it('rejects an invalid config via json', async () => {
    await writeFile(join(dir, 'evident.config.json'), JSON.stringify({ version: 2 }));
    await expect(loadConfig({ cwd: dir })).rejects.toThrow(/Invalid/);
  });
});

