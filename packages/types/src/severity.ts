import type { Severity } from './enums.js';

/**
 * Severity ranking for `--fail-on` and ordering. Higher number = more severe.
 * Used to determine blocking findings and exit codes.
 */
export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFORMATIONAL: 1,
};

export const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

/**
 * Returns true if `severity` meets or exceeds the configured blocking threshold.
 * Any threshold not in the map blocks nothing (only explicit severities block).
 */
export function isBlocking(
  severity: Severity,
  failOnSeverities: string[] | undefined,
): boolean {
  if (!failOnSeverities || failOnSeverities.length === 0) return false;
  const normalized = failOnSeverities
    .map((s) => s.toUpperCase())
    .filter((s): s is Severity => s in SEVERITY_RANK);
  if (normalized.length === 0) return false;
  const minRank = Math.min(...normalized.map((s) => SEVERITY_RANK[s]));
  return SEVERITY_RANK[severity] >= minRank;
}
