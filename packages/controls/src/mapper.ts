import type { ControlEvaluation } from '@evident/types';
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
  findingIds: string[],
  framework: string,
): ControlEvaluation[] {
  const packs: Record<string, FrameworkControl[]> = { soc2: SOC2_CONTROLS };
  const controls = packs[framework] ?? [];
  return controls.map((ctrl) => ({
    framework,
    controlId: ctrl.id,
    controlTitle: ctrl.title,
    status: findingIds.length > 0 ? 'TECHNICAL_EVIDENCE_FOUND' : 'NOT_EVALUATED',
    evidenceIds: [],
    findingIds,
    limitations: ctrl.mappings.flatMap((m) => m.limitations),
  }));
}

export function mapCategoryToControlIds(category: string): string[] {
  return CATEGORY_TO_CONTROLS[category] ?? [];
}
