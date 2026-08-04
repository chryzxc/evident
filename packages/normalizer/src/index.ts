import type { NormalizedFinding } from '@evident/types';

export function coerceSeverity(raw: string | number | undefined): NormalizedFinding['severity'] {
  if (raw === undefined || raw === null) return 'INFORMATIONAL';
  const s = String(raw).toLowerCase();
  if (['critical' as string, 'crit'].includes(s)) return 'CRITICAL';
  if (['high', 'error'].includes(s)) return 'HIGH';
  if (['medium', 'moderate', 'warning', 'warn'].includes(s)) return 'MEDIUM';
  if (['low'].includes(s)) return 'LOW';
  if (['info', 'informational', 'note'].includes(s)) return 'INFORMATIONAL';
  return 'INFORMATIONAL';
}

export function normalizeNpmAuditJson(data: Record<string, unknown>): NormalizedFinding[] {
  const vulns = (data.vulnerabilities ?? {}) as Record<string, Record<string, unknown>>;
  const findings: NormalizedFinding[] = [];
  const now = new Date().toISOString();

  for (const [pkg, info] of Object.entries(vulns)) {
    const viaArr = (Array.isArray(info.via) ? info.via : [info.via]) as Array<
      Record<string, unknown> | string
    >;
    const cves: string[] = [];
    const cwes: string[] = [];

    for (const v of viaArr) {
      if (typeof v === 'string') {
        if (v.startsWith('CVE-')) cves.push(v);
        continue;
      }
      if (v?.cwe && Array.isArray(v.cwe)) {
        cwes.push(...v.cwe.map(String));
      }
    }

    findings.push({
      id: `EVD-npm-${findings.length}`,
      fingerprint: `npm:${pkg}`,
      title: String(info.title ?? `${pkg} vulnerability`),
      description: String(info.overview ?? ''),
      category: 'VULNERABILITY',
      severity: coerceSeverity(info.severity as string),
      confidence: 'HIGH',
      status: 'OPEN',
      sources: [{ tool: 'npm-audit', detectedAt: now }],
      locations: [{ path: 'package.json' }],
      identifiers: [
        ...cves.map((c) => ({ type: 'CVE' as const, value: c })),
        ...cwes.map((c) => ({ type: 'CWE' as const, value: c })),
        { type: 'PACKAGE' as const, value: pkg },
      ],
      mappings: [],
      evidence: [],
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  return findings;
}

export function normalizeTrufflehogJsonl(raw: string): NormalizedFinding[] {
  const lines = raw.trim().split('\n').filter(Boolean);
  const findings: NormalizedFinding[] = [];
  const now = new Date().toISOString();

  const get = (obj: unknown, ...path: string[]): unknown => {
    let cur: unknown = obj;
    for (const key of path) {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[key];
    }
    return cur;
  };

  for (let i = 0; i < lines.length; i++) {
    const entry = JSON.parse(lines[i]!) as Record<string, unknown>;
    const fingerprint = String(entry['Redacted'] ?? entry['SourceID'] ?? `trufflehog-${i}`);

    findings.push({
      id: `EVD-th-${i}`,
      fingerprint: `trufflehog:${String(fingerprint)}`,
      title: 'Hardcoded secret detected',
      description: `Secret of type ${String(entry['DetectorType'] ?? 'unknown')} found in source`,
      category: 'SECRET',
      severity: entry['Verified'] ? 'HIGH' : 'MEDIUM',
      confidence: entry['Verified'] ? 'HIGH' : 'MEDIUM',
      status: 'OPEN',
      sources: [{ tool: 'trufflehog', detectedAt: now }],
      locations: [
        {
          path: String(
            get(entry, 'SourceMetadata', 'Data', 'Filesystem', 'file') ??
              entry['File'] ??
              entry['SourceName'] ??
              '',
          ),
          lineStart: (Number(get(entry, 'SourceMetadata', 'Data', 'Filesystem', 'line')) || undefined),
        },
      ],
      identifiers: [{ type: 'SECRET_FINGERPRINT', value: String(fingerprint) }],
      mappings: [],
      evidence: [],
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  return findings;
}
