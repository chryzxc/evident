import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@evident/config';
import type { AdapterContext, RawScannerResult, ScannerAdapter } from './types.js';
import { NpmAuditAdapter } from './npm-audit.js';
import { SemgrepAdapter } from './semgrep.js';
import { TrivyAdapter } from './trivy.js';
import { TrufflehogAdapter } from './trufflehog.js';

const context: AdapterContext = {
  root: '.',
  repository: {
    root: '.',
    name: 'fixture',
    languages: [],
    packageManagers: [],
    frameworks: [],
    isMonorepo: false,
    workspaces: [],
    sourceRoots: [],
    testDirs: [],
    workflows: [],
    dockerFiles: [],
    hasHerokuConfig: false,
    hasTsconfig: false,
    packageJsons: [],
  },
  config: DEFAULT_CONFIG,
  offline: true,
};

async function fixture(name: string): Promise<string> {
  return readFile(new URL(`../../../fixtures/scanner-outputs/${name}`, import.meta.url), 'utf8');
}

function raw(adapterId: string, output: string): RawScannerResult {
  return {
    adapterId,
    format: adapterId === 'trufflehog' ? 'jsonl' : 'json',
    raw: output,
    stdout: output,
    stderr: '',
    exitCode: 0,
    durationMs: 1,
    timedOut: false,
  };
}

describe('scanner output contracts', () => {
  const cases: Array<[string, ScannerAdapter, string, string, string]> = [
    ['npm-audit', new NpmAuditAdapter(), 'npm-audit.json', 'CVE-2024-29041', 'HIGH'],
    ['semgrep', new SemgrepAdapter([]), 'semgrep.json', 'javascript.lang.security.audit.eval-detected', 'HIGH'],
    ['trivy', new TrivyAdapter(['vuln']), 'trivy.json', 'CVE-2024-0001', 'CRITICAL'],
    ['trufflehog', new TrufflehogAdapter(true), 'trufflehog.jsonl', 'AKIA...TEST', 'HIGH'],
  ];

  it.each(cases)('normalizes %s output', async (adapterId, adapter, filename, identifier, severity) => {
      const findings = await adapter.normalize(raw(adapterId, await fixture(filename)), context);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe(severity);
      expect(findings[0]?.identifiers.some((item) => item.value === identifier)).toBe(true);
  });
});
