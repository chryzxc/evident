import type { EvidenceReference } from '@evident/types';
import type { RepositoryContext } from '@evident/repository';

export async function discoverEvidence(repo: RepositoryContext): Promise<EvidenceReference[]> {
  const evidence: EvidenceReference[] = [];
  const now = () => new Date().toISOString();

  for (const wf of repo.workflows) {
    evidence.push({
      id: `EV-${evidence.length}`,
      type: 'WORKFLOW',
      title: 'CI workflow',
      description: `GitHub Actions workflow: ${wf}`,
      path: wf,
      commitSha: repo.git?.sha ?? 'unknown',
      repository: repo.name,
      redacted: false,
      collectedAt: now(),
    });
  }

  return evidence;
}
