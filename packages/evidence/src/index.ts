import type { EvidenceReference } from '@evident/types';
import type { RepositoryContext } from '@evident/repository';
import { hashFile, listFiles } from '@evident/repository';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function discoverEvidence(repo: RepositoryContext): Promise<EvidenceReference[]> {
  const evidence: EvidenceReference[] = [];
  const now = () => new Date().toISOString();

  const add = async (
    type: EvidenceReference['type'],
    title: string,
    description: string,
    path: string,
  ) => {
    evidence.push({
      id: `EV-${evidence.length}`,
      type,
      title,
      description,
      path,
      commitSha: repo.git?.sha ?? 'unknown',
      repository: repo.name,
      contentHash: await hashFile(repo.root, path).catch(() => undefined),
      redacted: false,
      collectedAt: now(),
    });
  };

  for (const workflow of repo.workflows) {
    await add('WORKFLOW', 'CI workflow', `GitHub Actions workflow: ${workflow}`, workflow);
  }

  const repositoryArtifacts: Array<[string, string, string]> = [
    ['SECURITY.md', 'Security policy', 'Repository security policy'],
    ['CODEOWNERS', 'Code ownership', 'Repository code ownership rules'],
    ['.github/dependabot.yml', 'Dependabot configuration', 'Automated dependency update configuration'],
    ['package.json', 'Package manifest', 'Node.js package manifest'],
    ['tsconfig.json', 'TypeScript configuration', 'TypeScript project configuration'],
  ];

  for (const [path, title, description] of repositoryArtifacts) {
    if (existsSync(join(repo.root, path))) {
      await add(
        path === 'SECURITY.md' || path === 'CODEOWNERS' ? 'DOCUMENTATION' : 'CONFIGURATION',
        title,
        description,
        path,
      );
    }
  }

  const sourceFiles = await listFiles({
    cwd: repo.root,
    include: ['**/*.{js,cjs,mjs,ts,cts,mts,jsx,tsx}'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/fixtures/**'],
  });
  for (const path of sourceFiles) {
    const content = readFileSync(join(repo.root, path), 'utf8');
    if (/\b(authenticate|authorize|requireAuth|jwt\.verify|passport\.authenticate)\b/i.test(content)) {
      await add(
        'SOURCE_CODE',
        'Authentication or authorization implementation',
        'Source contains an authentication or authorization implementation signal.',
        path,
      );
    }
    if (/\b(auditLog|auditLogger|audit\.record|securityEvent)\b/i.test(content)) {
      await add(
        'SOURCE_CODE',
        'Audit logging implementation',
        'Source contains an audit logging or security event implementation signal.',
        path,
      );
    }
  }

  return evidence;
}
