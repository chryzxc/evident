import { createHash } from 'node:crypto';
import type { NormalizedFinding } from '@evident/types';

export function computeFingerprint(finding: NormalizedFinding): string {
  const signals: string[] = [];

  const idByType: Record<string, string> = {};
  for (const id of finding.identifiers) {
    const prev = idByType[id.type];
    if (!prev || id.value < prev) idByType[id.type] = id.value;
  }

  const orderedTypes = Object.keys(idByType).sort();
  for (const t of orderedTypes) {
    signals.push(`${t}:${idByType[t]}`);
  }

  if (finding.locations.length > 0) {
    const loc = finding.locations[0]!;
    signals.push(`file:${loc.path ?? ''}`);
    if (loc.lineStart !== undefined) signals.push(`line:${loc.lineStart}`);
    if (loc.lineEnd !== undefined) signals.push(`lineend:${loc.lineEnd}`);
  }

  signals.push(`cat:${finding.category}`);
  signals.push(`title:${hashTrunc(finding.title)}`);

  return createHash('sha256')
    .update(signals.join('\u0000'))
    .digest('hex')
    .slice(0, 16);
}

export function computeSecretFingerprint(finding: NormalizedFinding): string | undefined {
  for (const id of finding.identifiers) {
    if (id.type === 'SECRET_FINGERPRINT') return id.value;
  }
  return undefined;
}

export function computeCveFingerprint(finding: NormalizedFinding): string | undefined {
  const packages = finding.identifiers
    .filter((id) => id.type === 'PACKAGE')
    .map((id) => id.value)
    .sort();
  for (const id of finding.identifiers) {
    if (id.type === 'CVE') return `${packages.join(',') || 'unknown-package'}:${id.value}`;
  }
  return undefined;
}

function hashTrunc(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}
