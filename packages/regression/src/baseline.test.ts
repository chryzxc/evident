import { describe, expect, it } from 'vitest';
import type { EvidentFinding } from '@evident/types';
import { classifyFindings, type Baseline } from './baseline.js';

function finding(severity: EvidentFinding['severity']): EvidentFinding {
  return {
    id: 'EVD-1',
    fingerprint: 'cve:express:CVE-2024-0001',
    title: 'Finding',
    description: 'Description',
    category: 'VULNERABILITY',
    severity,
    confidence: 'HIGH',
    status: 'OPEN',
    sources: [],
    locations: [],
    identifiers: [],
    mappings: [],
    evidence: [],
    firstSeenAt: '',
    lastSeenAt: '',
  };
}

const baseline: Baseline = {
  schemaVersion: 1,
  createdAt: '',
  repository: 'fixture',
  profiles: ['security'],
  frameworks: [],
  fingerprints: [
    {
      fingerprint: 'cve:express:CVE-2024-0001',
      severity: 'MEDIUM',
      category: 'VULNERABILITY',
      title: 'Finding',
    },
  ],
};

describe('classifyFindings', () => {
  it('classifies severity changes and fixed findings', () => {
    expect(classifyFindings([finding('HIGH')], baseline)[0]?.classification).toBe('WORSENED');
    expect(classifyFindings([finding('LOW')], baseline)[0]?.classification).toBe('IMPROVED');
    expect(classifyFindings([], baseline)[0]?.classification).toBe('FIXED');
  });
});
