import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageJson } from './package-json.js';

export function detectLanguages(root: string, rootPkg: PackageJson | undefined): string[] {
  const languages = new Set<string>();
  const hasTsconfig = existsSync(join(root, 'tsconfig.json'));
  const hasJsConfig = existsSync(join(root, 'jsconfig.json'));

  if (hasTsconfig) languages.add('TypeScript');
  if (hasJsConfig || (rootPkg && !hasTsconfig)) languages.add('JavaScript');

  if (existsSync(join(root, 'Dockerfile')) || existsSync(join(root, 'docker-compose.yml'))) {
    // Dockerfile is IaC, not a language; tracked separately.
  }

  return [...languages];
}

export function detectPackageManagers(root: string): string[] {
  const managers = new Set<string>();
  if (existsSync(join(root, 'package.json'))) {
    managers.add('npm');
    if (existsSync(join(root, 'pnpm-lock.yaml'))) managers.add('pnpm');
    if (existsSync(join(root, 'yarn.lock'))) managers.add('yarn');
  }
  return [...managers];
}

const FRAMEWORK_MARKERS: Array<[string, string[]]> = [
  ['Express', ['express']],
  ['NestJS', ['@nestjs/core', '@nestjs/common']],
  ['Next.js', ['next']],
  ['React', ['react', 'react-dom']],
  ['Vue', ['vue']],
  ['Fastify', ['fastify']],
  ['Koa', ['koa']],
];

export function detectFrameworks(rootPkg: PackageJson | undefined): string[] {
  if (!rootPkg) return [];
  const deps = {
    ...(rootPkg.dependencies ?? {}),
    ...(rootPkg.devDependencies ?? {}),
  };
  return FRAMEWORK_MARKERS.filter(([, names]) => names.some((n) => n in deps)).map(([f]) => f);
}

export function isMonorepo(
  root: string,
  rootPkg: PackageJson | undefined,
): { monorepo: boolean; workspaces: string[] } {
  if (existsSync(join(root, 'pnpm-workspace.yaml'))) {
    return { monorepo: true, workspaces: ['packages/*'] };
  }
  if (rootPkg?.workspaces) {
    const workspaces = Array.isArray(rootPkg.workspaces)
      ? rootPkg.workspaces
      : rootPkg.workspaces.packages;
    return { monorepo: workspaces.length > 0, workspaces };
  }
  return { monorepo: false, workspaces: [] };
}
