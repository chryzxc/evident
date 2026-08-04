import { z } from 'zod';
import {
  FindingCategorySchema,
  SeveritySchema,
  ConfidenceSchema,
  FindingStatusSchema,
} from './enums.js';
import { FindingSourceSchema, FindingLocationSchema, FindingIdentifierSchema, RemediationGuidanceSchema, GitReferenceSchema } from './common.js';
import { ControlMappingSchema } from './controls.js';
import { EvidenceReferenceSchema } from './evidence.js';

export const EvidentFindingSchema = z.object({
  id: z.string(),
  fingerprint: z.string(),

  title: z.string(),
  description: z.string(),

  category: FindingCategorySchema,
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  status: FindingStatusSchema,

  sources: z.array(FindingSourceSchema),
  locations: z.array(FindingLocationSchema),
  identifiers: z.array(FindingIdentifierSchema),

  technicalImpact: z.string().optional(),
  remediation: RemediationGuidanceSchema.optional(),

  mappings: z.array(ControlMappingSchema).default([]),
  evidence: z.array(EvidenceReferenceSchema).default([]),

  introducedBy: GitReferenceSchema.optional(),
  fixedBy: GitReferenceSchema.optional(),

  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});
export type EvidentFinding = z.infer<typeof EvidentFindingSchema>;

/**
 * Pre-dedup finding emitted by normalizers / native rules. Carries one source
 * (the tool that produced it) and a stable fingerprint seed that the deduplicator
 * promotes to the canonical fingerprint.
 */
export const NormalizedFindingSchema = EvidentFindingSchema;
export type NormalizedFinding = EvidentFinding;
