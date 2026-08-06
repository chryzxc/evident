import simpleGit from 'simple-git';

export interface GitMetadata {
  sha: string;
  branch?: string;
  isDirty: boolean;
  remotes: string[];
}

/**
 * Best-effort git metadata. Returns undefined (never throws) when the directory
 * is not a git repository — `evident` must run on plain directories too.
 */
export async function getGitMetadata(root: string): Promise<GitMetadata | undefined> {
  try {
    const git = simpleGit(root);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return undefined;

    const [sha, branch, status, remotes] = await Promise.all([
      git.revparse(['HEAD']).catch(() => undefined),
      git.branch().catch(() => undefined),
      git.status().catch(() => undefined),
      git.getRemotes(true).catch(() => []),
    ]);

    if (!sha) return undefined;

    return {
      sha,
      branch: branch?.current || undefined,
      isDirty: status ? !status.isClean() : false,
      remotes: remotes.map((r: { name: string }) => r.name),
    };
  } catch {
    return undefined;
  }
}

export async function getChangedFiles(root: string, base = 'HEAD~1'): Promise<string[]> {
  const git = simpleGit(root);
  try {
    if (!(await git.checkIsRepo())) return [];
    const output = await git.diff(['--name-only', `${base}...HEAD`]);
    return output
      .split('\n')
      .map((path) => path.trim())
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}
