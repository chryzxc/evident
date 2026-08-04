import { createHash } from 'node:crypto';

export interface CacheKeyInput {
  tool: string;
  version?: string;
  configHash?: string;
  inputHash: string;
}

export function cacheKey(input: CacheKeyInput): string {
  const parts = [input.tool, input.version ?? 'unknown', input.configHash ?? '', input.inputHash];
  return createHash('sha256').update(parts.join('\u0001')).digest('hex');
}
