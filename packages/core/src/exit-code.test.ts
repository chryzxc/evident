import { describe, expect, it } from 'vitest';
import type { EvidentFinding } from '@evident/types';
import { computeExitCode, EXIT } from './exit-code.js';

const adapters = [] as never[];

function finding(over: Partial<EvidentFinding> = {}): EvidentFinding {
  return {
    id: '1',
    fingerprint: 'x',
    title: 't',
    description: 'd',
    category: 'SECRET',
    severity: 'HIGH',
    confidence: 'HIGH',
    status: 'OPEN',
    sources: [],
    locations: [],
    identifiers: [],
    mappings: [],
    evidence: [],
    firstSeenAt: '',
    lastSeenAt: '',
    ...over,
  } as EvidentFinding;
}

describe('exit code matrix', () => {
  it('returns OK when no findings', () => {
    expect(
      computeExitCode({
        result: { findings: [], regression: [] },
        failOn: { severity: ['high'], newFindingsOnly: false },
        adapters,
      }),
    ).toBe(EXIT.OK);
  });

  it('blocks when an open finding meets the threshold', () => {
    expect(
      computeExitCode({
        result: {
          findings: [finding({ severity: 'HIGH', status: 'OPEN' })],
          regression: [],
        },
        failOn: { severity: ['high', 'critical'], newFindingsOnly: false },
        adapters,
      }),
    ).toBe(EXIT.BLOCKING_FINDINGS);
  });

  it('does not block on non-open or below-threshold findings', () => {
    expect(
      computeExitCode({
        result: {
          findings: [finding({ severity: 'CRITICAL', status: 'FIXED' })],
          regression: [],
        },
        failOn: { severity: ['high'], newFindingsOnly: false },
        adapters,
      }),
    ).toBe(EXIT.OK);
  });

  it('respects newFindingsOnly', () => {
    expect(
      computeExitCode({
        result: {
          findings: [finding({ severity: 'HIGH', status: 'OPEN' })],
          regression: [],
        },
        failOn: { severity: ['high'], newFindingsOnly: true },
        adapters,
      }),
    ).toBe(EXIT.OK);
  });

  it('returns scanner failure when a required adapter fails', () => {
    expect(
      computeExitCode({
        result: { findings: [], regression: [] },
        failOn: { severity: [], newFindingsOnly: false },
        adapters: [
          {
            id: 'semgrep',
            displayName: 'Semgrep',
            status: 'failed',
            durationMs: 5,
            required: true,
          },
        ],
      }),
    ).toBe(EXIT.SCANNER_FAILURE);
  });
});
