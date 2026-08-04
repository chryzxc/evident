import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { jailPath } from './traverse.js';

export async function hashFile(root: string, relativePath: string): Promise<string> {
  const abs = jailPath(root, relativePath);
  const content = await readFile(abs);
  return createHash('sha256').update(content).digest('hex');
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
