export interface PackageJson {
  name?: string;
  version?: string;
  type?: 'module' | 'commonjs';
  private?: boolean;
  workspaces?: string[] | { packages: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: { node?: string };
}

export async function readPackageJson(path: string): Promise<PackageJson | undefined> {
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return undefined;
  }
}

export function allDeps(pkg: PackageJson | undefined): Record<string, string> {
  if (!pkg) return {};
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
}

export function hasDep(pkg: PackageJson | undefined, name: string): boolean {
  return Boolean(allDeps(pkg)[name]);
}
