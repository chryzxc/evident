import { describe, expect, it } from 'vitest';
import {
  EvidentFindingSchema,
  EvidenceReferenceSchema,
  ControlMappingSchema,
  ScanResultSchema,
  isBlocking,
  SEVERITY_RANK,
} from './index.js';

const finding = {
  id: 'EVD-0001',
  fingerprint: 'sha256:abc',
  title: 'Hardcoded secret',
  description: 'A secret was detected.',
  category: 'SECRET',
  severity: 'HIGH',
  confidence: 'HIGH',
  status: 'OPEN',
  sources: [{ tool: 'trufflehog', detectedAt: '2026-01-01T00:00:00.000Z' }],
  locations: [{ path: 'src/config.ts', lineStart: 12, lineEnd: 12 }],
  identifiers: [{ type: 'SECRET_FINGERPRINT', value: 'sha256:deadbeef' }],
  firstSeenAt: '2026-01-01T00:00:00.000Z',
  lastSeenAt: '2026-01-01T00:00:00.000Z',
};

describe('core schemas round-trip', () => {
  it('parses and re-serializes a finding', () => {
    const parsed = EvidentFindingSchema.parse(finding);
    expect(parsed.id).toBe('EVD-0001');
    expect(parsed.mappings).toEqual([]);
    expect(parsed.evidence).toEqual([]);
    // Re-serialization is stable.
    expect(EvidentFindingSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('parses an evidence reference', () => {
    const ev = EvidenceReferenceSchema.parse({
      id: 'EV-1',
      type: 'WORKFLOW',
      title: 'CI workflow',
      description: 'runs tests',
      path: '.github/workflows/ci.yml',
      commitSha: '7f81abc',
      repository: 'climate-rx',
      collectedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(ev.redacted).toBe(false);
  });

  it('parses a control mapping with defaults', () => {
    const cm = ControlMappingSchema.parse({
      framework: 'soc2',
      controlId: 'CC7.2',
      controlTitle: 'System monitoring',
      relationship: 'SUPPORTS',
      strength: 'STRONG',
      explanation: 'Audit middleware logs PHI access.',
    });
    expect(cm.technicalCoverageOnly).toBe(true);
    expect(cm.limitations).toEqual([]);
  });

  it('rejects an invalid severity', () => {
    expect(() => EvidentFindingSchema.parse({ ...finding, severity: 'BLOCKER' })).toThrow();
  });

  it('parses a full ScanResult', () => {
    const result = ScanResultSchema.parse({
      schemaVersion: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      repository: { name: 'demo', root: '.' },
      coverage: { complete: true },
      durationMs: 42,
      exitCode: 0,
    });
    expect(result.findings).toEqual([]);
    expect(result.adapters).toEqual([]);
  });
});

describe('severity helpers', () => {
  it('ranks critical above high', () => {
    expect(SEVERITY_RANK.CRITICAL).toBeGreaterThan(SEVERITY_RANK.HIGH);
  });

  it('blocks on configured threshold', () => {
    expect(isBlocking('HIGH', ['high', 'critical'])).toBe(true);
    expect(isBlocking('MEDIUM', ['high', 'critical'])).toBe(false);
    expect(isBlocking('CRITICAL', undefined)).toBe(false);
  });
});
