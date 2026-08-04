import { describe, expect, it } from 'vitest';
import type { NormalizedFinding } from '@evident/types';
import { deduplicate } from './grouper.js';
import { computeFingerprint } from './fingerprint.js';

function finding(over: Partial<NormalizedFinding> = {}): NormalizedFinding {
  const now = new Date().toISOString();
  return {
    id: '1',
    fingerprint: 'x',
    title: 'Test finding',
    description: 'desc',
    category: 'VULNERABILITY',
    severity: 'HIGH',
    confidence: 'HIGH',
    status: 'OPEN',
    sources: [{ tool: 'semgrep', detectedAt: now }],
    locations: [{ path: 'src/app.ts', lineStart: 10 }],
    identifiers: [],
    mappings: [],
    evidence: [],
    firstSeenAt: now,
    lastSeenAt: now,
    ...over,
  } as NormalizedFinding;
}

describe('fingerprint stability', () => {
  it('produces the same fingerprint for identical findings', () => {
    const fp1 = computeFingerprint(finding({ identifiers: [{ type: 'CVE', value: 'CVE-2024-0001' }] }));
    const fp2 = computeFingerprint(finding({ identifiers: [{ type: 'CVE', value: 'CVE-2024-0001' }] }));
    expect(fp1).toBe(fp2);
  });
});

describe('deduplicate', () => {
  it('merges findings with the same CVE', () => {
    const f1 = finding({
      id: '1',
      fingerprint: 'a',
      identifiers: [{ type: 'CVE', value: 'CVE-2024-0001' }],
      sources: [{ tool: 'npm-audit', detectedAt: '' }],
    });
    const f2 = finding({
      id: '2',
      fingerprint: 'b',
      identifiers: [{ type: 'CVE', value: 'CVE-2024-0001' }],
      sources: [{ tool: 'trivy', detectedAt: '' }],
    });

    const groups = deduplicate([f1, f2]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.primary.sources).toHaveLength(2);
    expect(groups[0]!.reason).toContain('trivy');
    expect(groups[0]!.reason).toContain('npm-audit');
  });

  it('does not merge distinct findings', () => {
    const f1 = finding({
      identifiers: [{ type: 'CVE', value: 'CVE-2024-0001' }],
    });
    const f2 = finding({
      identifiers: [{ type: 'CVE', value: 'CVE-2024-0002' }],
    });

    const groups = deduplicate([f1, f2]);
    expect(groups).toHaveLength(2);
  });

  it('merges by secret fingerprint', () => {
    const f1 = finding({
      category: 'SECRET',
      identifiers: [{ type: 'SECRET_FINGERPRINT', value: 'sha256:abc123' }],
      sources: [{ tool: 'trufflehog', detectedAt: '' }],
    });
    const f2 = finding({
      category: 'SECRET',
      identifiers: [{ type: 'SECRET_FINGERPRINT', value: 'sha256:abc123' }],
      sources: [{ tool: 'semgrep', detectedAt: '' }],
    });

    const groups = deduplicate([f1, f2]);
    expect(groups).toHaveLength(1);
  });
});
