import type { NormalizedFinding } from '@evident/types';
import type { AdapterContext, RawScannerResult } from './types.js';
import { BaseProcessAdapter } from './base.js';

export class SemgrepAdapter extends BaseProcessAdapter {
  id = 'semgrep';
  displayName = 'Semgrep';

  constructor(private readonly semgrepConfigs: string[]) {
    super('semgrep');
  }

  getArgs(_ctx: AdapterContext): string[] {
    const args = ['scan', '--json'];
    for (const c of this.semgrepConfigs) {
      args.push('--config', c);
    }
    return args;
  }

  async normalize(raw: RawScannerResult): Promise<NormalizedFinding[]> {
    return parseSemgrepJson(JSON.parse(raw.raw));
  }
}

function parseSemgrepJson(data: Record<string, unknown>): NormalizedFinding[] {
  const results = (data['results'] ?? data) as Array<Record<string, unknown> | undefined>;
  if (!Array.isArray(results)) return [];

  const now = new Date().toISOString();
  return results
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r, i) => {
      const extra = (r['extra'] as Record<string, unknown> | undefined) ?? {};
      const start = (r['start'] as Record<string, unknown> | undefined) ?? {};
      return {
        id: `EVD-semgrep-${i}`,
        fingerprint: `semgrep:${String(r['check_id'] ?? r['rule'] ?? i)}`,
        title: String(extra['message'] ?? r['check_id'] ?? 'Semgrep finding'),
        description: String(extra['message'] ?? ''),
        category: 'VULNERABILITY' as NormalizedFinding['category'],
        severity: coerceSeverity(extra['severity'] ?? r['severity']),
        confidence: 'HIGH' as const,
        status: 'OPEN' as const,
        sources: [{ tool: 'semgrep', detectedAt: now }],
        locations: [{ path: String(r['path'] ?? ''), lineStart: Number(start['line']) || undefined }],
        identifiers: [{ type: 'RULE' as const, value: String(r['check_id'] ?? '') }],
        mappings: [],
        evidence: [],
        firstSeenAt: now,
        lastSeenAt: now,
      };
    });
}

function coerceSeverity(raw: unknown): NormalizedFinding['severity'] {
  const s = String(raw ?? '').toLowerCase();
  if (['error', 'critical', 'high'].includes(s)) return 'HIGH';
  if (['warning', 'warn', 'medium', 'moderate'].includes(s)) return 'MEDIUM';
  if (['info', 'note', 'low'].includes(s)) return 'LOW';
  return 'INFORMATIONAL';
}
