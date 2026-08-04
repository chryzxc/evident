import { glob } from 'tinyglobby';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.evident/**',
  '**/.turbo/**',
];

export interface ListFilesOptions {
  cwd: string;
  include?: string[];
  exclude?: string[];
  dot?: boolean;
}

/**
 * List repository files honoring include/exclude globs. Paths are returned
 * relative to `cwd`, normalized to POSIX separators. Hard-coded excludes
 * (node_modules, build output, VCS) always apply and cannot be overridden —
 * this is a security as well as performance boundary.
 */
export async function listFiles(options: ListFilesOptions): Promise<string[]> {
  const { cwd, include = ['**/*'], exclude = [], dot = false } = options;
  const absRoot = resolve(cwd);

  const matches = await glob(include, {
    cwd: absRoot,
    dot,
    ignore: [...DEFAULT_IGNORE, ...exclude],
    onlyFiles: true,
    expandDirectories: true,
  });

  return matches
    .map((p) => {
      const abs = isAbsolute(p) ? p : resolve(absRoot, p);
      const rel = relative(absRoot, abs);
      return rel.split(sep).join('/');
    })
    .filter((p) => p.length > 0 && !p.startsWith('..'))
    .sort();
}

/**
 * Jail an arbitrary path under `root`. Returns the absolute, normalized path if
 * it resolves inside `root`; otherwise throws to prevent path traversal.
 */
export function jailPath(root: string, target: string): string {
  const absRoot = resolve(root);
  const absTarget = resolve(absRoot, target);
  const rel = relative(absRoot, absTarget);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path traversal blocked: ${target} escapes ${root}`);
  }
  return absTarget;
}
