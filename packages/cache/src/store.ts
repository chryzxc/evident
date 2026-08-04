import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cacheKey, type CacheKeyInput } from './keys.js';

export interface CacheEntry<T = unknown> {
  key: string;
  tool: string;
  version?: string;
  configHash?: string;
  inputHash: string;
  createdAt: string;
  data: T;
}

/**
 * On-disk cache for normalized findings and raw scanner results.
 *
 * Entries are keyed deterministically by tool + version + config-hash + input-hash
 * so that changing either the scanner version or the Evident configuration
 * invalidates stale entries automatically.
 */
export class CacheStore {
  constructor(private readonly cacheDir: string) {}

  private path(key: string): string {
    return join(this.cacheDir, `${key}.json`);
  }

  async get<T = unknown>(input: CacheKeyInput): Promise<CacheEntry<T> | undefined> {
    const key = cacheKey(input);
    try {
      const raw = await readFile(this.path(key), 'utf8');
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      return undefined;
    }
  }

  async set<T = unknown>(input: CacheKeyInput, data: T): Promise<CacheEntry<T>> {
    const key = cacheKey(input);
    const entry: CacheEntry<T> = {
      key,
      tool: input.tool,
      version: input.version,
      configHash: input.configHash,
      inputHash: input.inputHash,
      createdAt: new Date().toISOString(),
      data,
    };
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(this.path(key), JSON.stringify(entry, null, 2), 'utf8');
    return entry;
  }

  async clear(): Promise<void> {
    await rm(this.cacheDir, { recursive: true, force: true });
  }
}
