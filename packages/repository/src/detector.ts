import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { glob } from 'tinyglobby';
import { getGitMetadata, type GitMetadata } from './git.js';
import { readPackageJson } from './package-json.js';
import { detectFrameworks, detectLanguages, detectPackageManagers, isMonorepo } from './signals.js';

export interface RepositoryContext {
  root: string;
  name: string;
  languages: string[];
  packageManagers: string[];
  frameworks: string[];
  isMonorepo: boolean;
  workspaces: string[];
  sourceRoots: string[];
  testDirs: string[];
  workflows: string[];
  dockerFiles: string[];
  hasHerokuConfig: boolean;
  hasTsconfig: boolean;
  packageJsons: string[];
  git?: GitMetadata;
}

export interface DetectOptions {
  root: string;
  exclude?: string[];
}

export async function detectRepository(options: DetectOptions): Promise<RepositoryContext> {
  const root = options.root;
  const rootPkg = await readPackageJson(join(root, 'package.json'));

  const languages = detectLanguages(root, rootPkg);
  const packageManagers = detectPackageManagers(root);
  const frameworks = detectFrameworks(rootPkg);
  const { monorepo, workspaces } = isMonorepo(root, rootPkg);

  const workflowEntries = await glob(['.github/workflows/*.{yml,yaml}'], { cwd: root });
  const dockerFiles: string[] = [];
  for (const candidate of ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']) {
    if (existsSync(join(root, candidate))) dockerFiles.push(candidate);
  }

  const packageJsons = rootPkg ? ['package.json'] : [];
  if (monorepo && rootPkg) {
    const wsPackages = await glob(
      workspaces.map((w) => w.replace(/\/$/, '') + '/package.json'),
      { cwd: root },
    );
    packageJsons.push(...wsPackages);
  }

  const sourceRoots = inferSourceRoots(root);
  const testDirs = inferTestDirs(root);

  const git = await getGitMetadata(root);

  return {
    root,
    name: rootPkg?.name ?? basename(root),
    languages,
    packageManagers,
    frameworks,
    isMonorepo: monorepo,
    workspaces,
    sourceRoots,
    testDirs,
    workflows: workflowEntries,
    dockerFiles,
    hasHerokuConfig: existsSync(join(root, 'app.json')),
    hasTsconfig: existsSync(join(root, 'tsconfig.json')),
    packageJsons,
    git,
  };
}

function inferSourceRoots(root: string): string[] {
  const roots: string[] = [];
  for (const candidate of ['src', 'lib', 'server', 'app', 'client', 'packages']) {
    if (existsSync(join(root, candidate))) roots.push(candidate);
  }
  return roots;
}

function inferTestDirs(root: string): string[] {
  const dirs: string[] = [];
  for (const candidate of ['test', 'tests', '__tests__', 'spec']) {
    if (existsSync(join(root, candidate))) dirs.push(candidate);
  }
  return dirs;
}
