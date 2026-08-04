import type { ScanResult } from '@evident/types';

export interface Reporter {
  readonly format: string;
  render(result: ScanResult): string;
}

export interface FindingCounts {
  total: number;
  bySeverity: Record<string, number>;
  newBySeverity: Record<string, number>;
  fixed: number;
  controlRegressions: number;
}

export function summarize(result: ScanResult): FindingCounts {
  const bySeverity: Record<string, number> = {};
  const newBySeverity: Record<string, number> = {};
  let fixed = 0;

  const newFingerprints = new Set(
    result.regression.filter((r) => r.classification === 'NEW').map((r) => r.fingerprint),
  );
  const fixedFingerprints = new Set(
    result.regression.filter((r) => r.classification === 'FIXED').map((r) => r.fingerprint),
  );

  const hasBaseline = result.regression.length > 0;

  for (const f of result.findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;

    const isNew = hasBaseline ? newFingerprints.has(f.fingerprint) : f.status === 'OPEN';
    const isFixed = hasBaseline ? fixedFingerprints.has(f.fingerprint) : f.status === 'FIXED';

    if (isNew) newBySeverity[f.severity] = (newBySeverity[f.severity] ?? 0) + 1;
    if (isFixed) fixed += 1;
  }

  return {
    total: result.findings.length,
    bySeverity,
    newBySeverity,
    fixed,
    controlRegressions: result.regression.filter((r) => r.classification === 'CONTROL_REGRESSION')
      .length,
  };
}
