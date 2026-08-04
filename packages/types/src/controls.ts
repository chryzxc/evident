import { z } from 'zod';
import { ControlRelationshipSchema, MappingStrengthSchema, ControlEvaluationStatusSchema } from './enums.js';

export const ControlMappingSchema = z.object({
  framework: z.string(),
  controlId: z.string(),
  controlTitle: z.string(),

  relationship: ControlRelationshipSchema,
  strength: MappingStrengthSchema,

  explanation: z.string(),
  limitations: z.array(z.string()).default([]),

  technicalCoverageOnly: z.boolean().default(true),
});
export type ControlMapping = z.infer<typeof ControlMappingSchema>;

export const ControlEvaluationSchema = z.object({
  framework: z.string(),
  controlId: z.string(),
  controlTitle: z.string(),

  status: ControlEvaluationStatusSchema,

  evidenceIds: z.array(z.string()).default([]),
  findingIds: z.array(z.string()).default([]),

  limitations: z.array(z.string()).default([]),

  // Labeled "Technical Coverage Score" — never "Compliance Score".
  technicalCoverageScore: z.number().min(0).max(100).optional(),
});
export type ControlEvaluation = z.infer<typeof ControlEvaluationSchema>;
