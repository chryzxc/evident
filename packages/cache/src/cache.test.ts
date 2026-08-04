import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheStore, cacheKey } from './index.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'evident-cache-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('cacheKey', () => {
  it('is deterministic for the same inputs', () => {
    const a = cacheKey({ tool: 'npm-audit', version: '1', inputHash: 'abc' });
    const b = cacheKey({ tool: 'npm-audit', version: '1', inputHash: 'abc' });
    expect(a).toBe(b);
  });

  it('changes when version changes (invalidation)', () => {
    const v1 = cacheKey({ tool: 'semgrep', version: '1.0', inputHash: 'x' });
    const v2 = cacheKey({ tool: 'semgrep', version: '1.1', inputHash: 'x' });
    expect(v1).not.toBe(v2);
  });
});

describe('CacheStore', () => {
  it('round-trips an entry', async () => {
    const store = new CacheStore(join(dir, 'a'));
    await store.set({ tool: 't', version: '1', inputHash: 'h' }, { findings: [1, 2, 3] });
    const got = await store.get<{ findings: number[] }>({
      tool: 't',
      version: '1',
      inputHash: 'h',
    });
    expect(got?.data.findings).toEqual([1, 2, 3]);
  });

  it('returns undefined on miss', async () => {
    const store = new CacheStore(join(dir, 'b'));
    const got = await store.get({ tool: 't', inputHash: 'missing' });
    expect(got).toBeUndefined();
  });

  it('clears all entries', async () => {
    const store = new CacheStore(join(dir, 'c'));
    await store.set({ tool: 't', inputHash: 'h1' }, 1);
    await store.clear();
    expect(await store.get({ tool: 't', inputHash: 'h1' })).toBeUndefined();
  });
});
