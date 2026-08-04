import { describe, expect, it } from 'vitest';
import { EvidentConfigSchema, DEFAULT_CONFIG, validateConfig } from './index.js';
import { ConfigError } from './errors.js';

const sample = {
  version: 1,
  project: { name: 'climate-rx', type: 'application' },
  profiles: ['security', 'soc2', 'hipaa'],
  scanners: {
    npmAudit: { enabled: true },
    semgrep: { enabled: true, config: ['p/owasp-top-ten'] },
    trivy: { enabled: true, scanners: ['vuln', 'misconfig', 'secret'] },
    trufflehog: { enabled: true, verifiedOnly: true },
  },
  scan: {
    include: ['server/**', 'client/**', '.github/**'],
    exclude: ['node_modules/**', 'dist/**'],
  },
  policy: { failOn: { severity: ['critical', 'high'], newFindingsOnly: true } },
  privacy: { sendSourceToAI: false, redactSecrets: true, redactIdentifiers: true },
  reporting: { formats: ['terminal', 'json', 'html', 'sarif'], outputDirectory: '.evident/reports' },
};

describe('config schema', () => {
  it('parses the plan.md example fully', () => {
    const cfg = validateConfig(sample);
    expect(cfg.project.name).toBe('climate-rx');
    expect(cfg.scanners.semgrep?.enabled).toBe(true);
    expect(cfg.policy.failOn.severity).toEqual(['critical', 'high']);
    expect(cfg.privacy.sendSourceToAI).toBe(false);
  });

  it('applies safe defaults', () => {
    expect(DEFAULT_CONFIG.version).toBe(1);
    expect(DEFAULT_CONFIG.profiles).toEqual(['security']);
    expect(DEFAULT_CONFIG.privacy.sendSourceToAI).toBe(false);
    expect(DEFAULT_CONFIG.privacy.redactSecrets).toBe(true);
    expect(DEFAULT_CONFIG.reporting.formats).toEqual(['terminal', 'json']);
    expect(DEFAULT_CONFIG.reporting.outputDirectory).toBe('.evident/reports');
    expect(DEFAULT_CONFIG.scan.exclude).toContain('node_modules/**');
  });

  it('rejects an unknown version', () => {
    expect(() => validateConfig({ version: 2 })).toThrow(ConfigError);
  });

  it('rejects an invalid reporting format', () => {
    expect(() => validateConfig({ reporting: { formats: ['pdf'] } })).toThrow(ConfigError);
  });

  it('rejects an invalid fail-on severity type', () => {
    expect(() =>
      validateConfig({ policy: { failOn: { severity: [123] } } } as Record<string, unknown>),
    ).toThrow();
  });

  it('keeps zod schema and DEFAULT_CONFIG consistent', () => {
    expect(EvidentConfigSchema.parse({})).toEqual(DEFAULT_CONFIG);
  });
});
