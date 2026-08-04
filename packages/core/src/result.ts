import type {
  EvidentFinding,
  EvidenceReference,
  ControlEvaluation,
  AdapterRun,
  RegressionItem,
  RepositorySummary,
  ScanResult,
} from '@evident/types';
import type { RepositoryContext } from '@evident/repository';

export function toRepositorySummary(repo: RepositoryContext): RepositorySummary {
  return {
    name: repo.name,
    root: repo.root,
    languages: repo.languages,
    frameworks: repo.frameworks,
    packageManagers: repo.packageManagers,
    isMonorepo: repo.isMonorepo,
    git: repo.git
      ? {
          sha: repo.git.sha,
          branch: repo.git.branch,
          isDirty: repo.git.isDirty,
          remotes: repo.git.remotes,
        }
      : undefined,
  };
}

export interface BuildResultInput {
  generatedAt: string;
  repository: RepositorySummary;
  profiles: string[];
  frameworks: string[];
  findings: EvidentFinding[];
  evidence: EvidenceReference[];
  controls: ControlEvaluation[];
  adapters: AdapterRun[];
  regression: RegressionItem[];
  coverage: ScanResult['coverage'];
  durationMs: number;
  exitCode: number;
}

export function buildScanResult(input: BuildResultInput): ScanResult {
  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    repository: input.repository,
    profiles: input.profiles,
    frameworks: input.frameworks,
    findings: input.findings,
    evidence: input.evidence,
    controls: input.controls,
    adapters: input.adapters,
    regression: input.regression,
    coverage: input.coverage,
    durationMs: input.durationMs,
    exitCode: input.exitCode,
  };
}
