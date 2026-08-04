import { describe, expect, it } from 'vitest';
import { coerceSeverity, normalizeNpmAuditJson, normalizeTrufflehogJsonl } from './index.js';

describe('coerceSeverity', () => {
  it('maps known severities', () => {
    expect(coerceSeverity('critical')).toBe('CRITICAL');
    expect(coerceSeverity('high')).toBe('HIGH');
    expect(coerceSeverity('medium')).toBe('MEDIUM');
    expect(coerceSeverity('low')).toBe('LOW');
  });

  it('falls back to INFORMATIONAL for unknowns', () => {
    expect(coerceSeverity('unknown')).toBe('INFORMATIONAL');
    expect(coerceSeverity(undefined)).toBe('INFORMATIONAL');
  });
});

describe('normalizeNpmAuditJson', () => {
  it('parses a standard npm audit response', () => {
    const fixture = {
      vulnerabilities: {
        express: {
          severity: 'high',
          title: 'Open Redirect in express',
          overview: 'express is vulnerable to open redirect.',
          via: ['CVE-2024-29041'],
        },
        minimist: {
          severity: 'low',
          overview: 'Prototype Pollution',
          via: [{ cwe: ['CWE-1321'] }],
        },
      },
    };

    const findings = normalizeNpmAuditJson(fixture);
    expect(findings).toHaveLength(2);

    const high = findings.find((f) => f.severity === 'HIGH');
    expect(high?.identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'CVE', value: 'CVE-2024-29041' }),
        expect.objectContaining({ type: 'PACKAGE', value: 'express' }),
      ]),
    );

    const low = findings.find((f) => f.severity === 'LOW');
    expect(low?.identifiers).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'CWE', value: 'CWE-1321' })]),
    );
  });
});

describe('normalizeTrufflehogJsonl', () => {
  it('parses trufflehog JSON Lines output', () => {
    const fixture = [
      {
        DetectorType: 'AWS',
        Raw: 'AKIAIOSFODNN7EXAMPLE',
        Redacted: 'abc123',
        Verified: true,
        File: 'src/secrets.ts',
        SourceMetadata: {
          Data: { Filesystem: { file: 'src/secrets.ts', line: 42 } },
        },
      },
    ];

    const findings = normalizeTrufflehogJsonl(
      fixture.map((f) => JSON.stringify(f)).join('\n'),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe('SECRET');
    expect(findings[0]?.severity).toBe('HIGH');
    expect(findings[0]?.locations[0]?.path).toContain('secrets');
    expect(findings[0]?.sources[0]?.tool).toBe('trufflehog');
  });
});
