import type { ControlEvaluation, EvidenceReference, EvidentFinding } from '@evident/types';
import { SOC2_CONTROLS, type FrameworkControl } from './soc2.js';

const CATEGORY_TO_CONTROLS: Record<string, string[]> = {
  CI_CD: ['CC7.2', 'CC8.1'],
  SECRET: ['PI1.4'],
  AUTHENTICATION: ['CC6.2'],
  AUTHORIZATION: ['CC6.2'],
  AUDIT_LOGGING: ['CC7.2'],
  EVIDENCE_GAP: ['CC7.4'],
  OTHER: ['CC7.4'],
};

export function evaluateControls(
  findings: EvidentFinding[],
  evidence: EvidenceReference[],
  framework: string,
): ControlEvaluation[] {
  const packs: Record<string, FrameworkControl[]> = { soc2: SOC2_CONTROLS };
  const controls = packs[framework] ?? [];
  return controls.map((ctrl) => {
    const relevantFindings = findings.filter((finding) =>
      mapCategoryToControlIds(finding.category).includes(ctrl.id),
    );
    const relevantEvidence = evidence.filter((item) => supportsControl(item, ctrl.id));

    return {
      framework,
      controlId: ctrl.id,
      controlTitle: ctrl.title,
      status: relevantFindings.length > 0
        ? 'TECHNICAL_GAP'
        : relevantEvidence.length > 0
          ? 'TECHNICAL_EVIDENCE_FOUND'
          : 'MANUAL_EVIDENCE_REQUIRED',
      evidenceIds: relevantEvidence.map((item) => item.id),
      findingIds: relevantFindings.map((finding) => finding.id),
      limitations: ctrl.mappings.flatMap((mapping) => mapping.limitations),
    };
  });
}

export function mapCategoryToControlIds(category: string): string[] {
  return CATEGORY_TO_CONTROLS[category] ?? [];
}

function supportsControl(evidence: EvidenceReference, controlId: string): boolean {
  if (controlId === 'CC7.2' || controlId === 'CC8.1') return evidence.type === 'WORKFLOW';
  if (controlId === 'CC7.4') return evidence.path === 'SECURITY.md';
  if (controlId === 'PI1.4') return evidence.type === 'SCANNER_REPORT';
  if (controlId === 'CC6.2') return evidence.type === 'SOURCE_CODE';
  return false;
}
