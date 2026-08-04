import { describe, expect, it } from 'vitest';
import type { EvidenceReference, EvidentFinding } from '@evident/types';
import { evaluateControls } from './mapper.js';

const finding = (category: EvidentFinding['category']): EvidentFinding => ({
  id: 'EVD-1',
  fingerprint: 'fp',
  title: 'finding',
  description: 'description',
  category,
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
});

const evidence: EvidenceReference = {
  id: 'EV-1',
  type: 'WORKFLOW',
  title: 'CI workflow',
  description: 'CI workflow',
  path: '.github/workflows/ci.yml',
  commitSha: 'sha',
  repository: 'repo',
  redacted: false,
  collectedAt: '',
};

describe('evaluateControls', () => {
  it('marks matching findings as technical gaps', () => {
    const controls = evaluateControls([finding('CI_CD')], [evidence], 'soc2');
    expect(controls.find((control) => control.controlId === 'CC8.1')?.status).toBe('TECHNICAL_GAP');
  });

  it('marks workflow evidence as technical evidence without a matching gap', () => {
    const controls = evaluateControls([], [evidence], 'soc2');
    expect(controls.find((control) => control.controlId === 'CC8.1')?.status).toBe(
      'TECHNICAL_EVIDENCE_FOUND',
    );
  });
});
