import type { AdapterRun, ScanResult } from '@evident/types';
import { isBlocking } from '@evident/types';
import type { ResolvedConfig } from '@evident/config';

export const EXIT = {
  OK: 0,
  BLOCKING_FINDINGS: 1,
  INVALID_CONFIG: 2,
  SCANNER_FAILURE: 3,
  PARTIAL_SCAN: 4,
  INTERNAL_ERROR: 5,
} as const;

export interface ExitCodeInput {
  result: Pick<ScanResult, 'findings' | 'regression'>;
  failOn?: ResolvedConfig['policy']['failOn'];
  adapters: AdapterRun[];
}

/**
 * Determines the process exit code from scan output and policy.
 *
 * Priority: a required scanner that failed/timed out or was unavailable beats
 * the blocking-findings signal only when it was actually required. For the MVP
 * all external scanners are optional, so missing tools yield PARTIAL_SCAN only
 * when `complete` is false (handled by caller); here we focus on blocking policy.
 */
export function computeExitCode({ result, failOn, adapters }: ExitCodeInput): number {
  const requiredHardFailure = adapters.some(
    (a) => (a.status === 'failed' || a.status === 'timed_out') && a.required,
  );
  if (requiredHardFailure) return EXIT.SCANNER_FAILURE;

  const severities = failOn?.severity;
  const newOnly = failOn?.newFindingsOnly ?? false;

  const newFingerprints = new Set(
    result.regression.filter((r) => r.classification === 'NEW').map((r) => r.fingerprint),
  );

  const blocking = result.findings.filter((f) => {
    if (f.status !== 'OPEN') return false;
    if (!isBlocking(f.severity, severities)) return false;
    if (newOnly && !newFingerprints.has(f.fingerprint)) return false;
    return true;
  });

  return blocking.length > 0 ? EXIT.BLOCKING_FINDINGS : EXIT.OK;
}
