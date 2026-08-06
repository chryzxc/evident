import type { NormalizedFinding } from '@evident/types';
import { computeFingerprint, computeSecretFingerprint, computeCveFingerprint } from './fingerprint.js';

export interface DeduplicationGroup {
  fingerprint: string;
  primary: NormalizedFinding;
  duplicates: NormalizedFinding[];
  reason: string;
}

export function deduplicate(findings: NormalizedFinding[]): DeduplicationGroup[] {
  const grouped = new Map<string, NormalizedFinding[]>();

  for (const f of findings) {
    const key = fingerprintForCategory(f);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(f);
    } else {
      grouped.set(key, [f]);
    }
  }

  const result: DeduplicationGroup[] = [];
  for (const [fp, group] of grouped) {
    const primary = group[0]!;
    const sourceTools = [...new Set(group.map((f) => f.sources[0]?.tool ?? 'unknown'))];
    const reason =
      sourceTools.length > 1
        ? `Merged ${group.length} findings from ${sourceTools.join(', ')}`
        : `${group.length} finding${group.length > 1 ? 's' : ''} from ${sourceTools[0]}`;

    const merged: NormalizedFinding = {
      ...primary,
      fingerprint: fp,
      sources: group.flatMap((f) => f.sources),
      locations: group.flatMap((f) => f.locations),
      identifiers: dedupeIdentifiers(group.flatMap((f) => f.identifiers)),
    };

    result.push({
      fingerprint: fp,
      primary: merged,
      duplicates: group.slice(1),
      reason,
    });
  }

  return result;
}

function fingerprintForCategory(finding: NormalizedFinding): string {
  const secretFp = computeSecretFingerprint(finding);
  if (secretFp) return `secret:${secretFp}`;

  const cveFp = computeCveFingerprint(finding);
  if (cveFp) return `cve:${cveFp}`;

  const fileFp = computeFingerprint(finding);
  return `general:${fileFp}`;
}

function dedupeIdentifiers(
  ids: NormalizedFinding['identifiers'],
): NormalizedFinding['identifiers'] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const key = `${id.type}:${id.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
