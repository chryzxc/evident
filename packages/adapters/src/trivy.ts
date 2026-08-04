import type { NormalizedFinding } from '@evident/types';
import type { AdapterContext, RawScannerResult } from './types.js';
import { BaseProcessAdapter } from './base.js';

export class TrivyAdapter extends BaseProcessAdapter {
  id = 'trivy';
  displayName = 'Trivy';

  constructor(private readonly trivyScanners: string[]) {
    super('trivy');
  }

  getArgs(_ctx: AdapterContext): string[] {
    const args = ['fs', '--format', 'json'];
    if (this.trivyScanners.length > 0) {
      args.push('--scanners', this.trivyScanners.join(','));
    }
    args.push('.');
    return args;
  }

  async normalize(raw: RawScannerResult): Promise<NormalizedFinding[]> {
    return parseTrivyJson(JSON.parse(raw.raw));
  }
}

function parseTrivyJson(data: unknown): NormalizedFinding[] {
  const root = data as Record<string, unknown> | undefined;
  const results = (root?.['Results'] ?? []) as Array<Record<string, unknown>>;
  const findings: NormalizedFinding[] = [];
  const now = new Date().toISOString();

  for (const r of results) {
    const vulns = (r['Vulnerabilities'] ?? []) as Array<Record<string, unknown>>;
    for (const v of vulns) {
      const cve = v['VulnerabilityID'] as string | undefined;
      findings.push({
        id: `EVD-trivy-${findings.length}`,
        fingerprint: `trivy:${cve ?? 'unknown'}`,
        title: String(v['Title'] ?? cve ?? 'Trivy finding'),
        description: String(v['Description'] ?? ''),
        category: 'VULNERABILITY' as const,
        severity: trivySeverity(v['Severity']),
        confidence: 'HIGH' as const,
        status: 'OPEN' as const,
        sources: [{ tool: 'trivy', detectedAt: now }],
        locations: [{ path: String(r['Target'] ?? '') }],
        identifiers: cve ? [{ type: 'CVE' as const, value: cve }] : [],
        mappings: [],
        evidence: [],
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  }

  return findings;
}

function trivySeverity(raw: unknown): NormalizedFinding['severity'] {
  const s = String(raw ?? '').toUpperCase();
  if (['CRITICAL'].includes(s)) return 'CRITICAL';
  if (['HIGH'].includes(s)) return 'HIGH';
  if (['MEDIUM'].includes(s)) return 'MEDIUM';
  if (['LOW'].includes(s)) return 'LOW';
  return 'INFORMATIONAL';
}
