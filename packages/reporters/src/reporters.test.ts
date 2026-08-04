import { describe, expect, it } from 'vitest';
import { ScanResultSchema, type ScanResult } from '@evident/types';
import { jsonReporter, terminalReporter, summarize } from './index.js';

const BASE = {
  schemaVersion: 1 as const,
  generatedAt: '2026-01-01T00:00:00.000Z',
  repository: {
    name: 'climate-rx',
    root: '.',
    git: { sha: '7f81abc', isDirty: false, remotes: ['origin'] },
  },
  profiles: ['security', 'soc2'],
  findings: [
    {
      id: 'EVD-1',
      fingerprint: 'fp1',
      title: 'A',
      description: 'd',
      category: 'SECRET',
      severity: 'HIGH',
      confidence: 'HIGH',
      status: 'OPEN',
      sources: [],
      locations: [],
      identifiers: [],
      firstSeenAt: '',
      lastSeenAt: '',
    },
    {
      id: 'EVD-2',
      fingerprint: 'fp2',
      title: 'B',
      description: 'd',
      category: 'VULNERABILITY',
      severity: 'MEDIUM',
      confidence: 'HIGH',
      status: 'FIXED',
      sources: [],
      locations: [],
      identifiers: [],
      firstSeenAt: '',
      lastSeenAt: '',
    },
  ],
  coverage: { complete: true, partial: false, missingTools: [] },
  durationMs: 1234,
  exitCode: 0,
};

function fixture(over: Record<string, unknown> = {}): ScanResult {
  return ScanResultSchema.parse({ ...BASE, ...over });
}

describe('summarize', () => {
  it('counts findings by severity without a baseline', () => {
    const s = summarize(fixture());
    expect(s.bySeverity.HIGH).toBe(1);
    expect(s.bySeverity.MEDIUM).toBe(1);
    expect(s.newBySeverity.HIGH).toBe(1);
    expect(s.fixed).toBe(1);
  });

  it('counts control regressions when baseline present', () => {
    const s = summarize(
      fixture({
        regression: [
          { findingId: 'EVD-3', fingerprint: 'fp3', classification: 'CONTROL_REGRESSION' },
          { findingId: 'EVD-4', fingerprint: 'fp4', classification: 'NEW' },
        ],
      }),
    );
    expect(s.controlRegressions).toBe(1);
  });
});

describe('jsonReporter', () => {
  it('round-trips the scan result', () => {
    const result = fixture();
    const out = jsonReporter.render(result);
    expect(JSON.parse(out)).toEqual(result);
  });
});

describe('terminalReporter', () => {
  it('renders repository and counts', () => {
    const out = terminalReporter.render(fixture());
    expect(out).toContain('climate-rx');
    expect(out).toContain('7f81abc');
    expect(out).toContain('1 high');
    expect(out).toContain('Fixed findings: 1');
  });

  it('warns on incomplete coverage', () => {
    const out = terminalReporter.render(fixture({ coverage: { complete: false, partial: true, missingTools: ['semgrep'] } }));
    expect(out).toContain('Coverage incomplete');
    expect(out).toContain('semgrep');
  });
});
