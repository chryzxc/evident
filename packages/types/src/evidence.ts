import { z } from 'zod';
import { EvidenceTypeSchema } from './enums.js';

export const EvidenceReferenceSchema = z.object({
  id: z.string(),

  type: EvidenceTypeSchema,

  title: z.string(),
  description: z.string(),

  path: z.string().optional(),
  lineStart: z.number().int().nonnegative().optional(),
  lineEnd: z.number().int().nonnegative().optional(),

  commitSha: z.string(),
  repository: z.string(),
  contentHash: z.string().optional(),

  environment: z.string().optional(),
  sourceTool: z.string().optional(),

  redacted: z.boolean().default(false),
  collectedAt: z.string(),
});
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
