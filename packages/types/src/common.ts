import { z } from 'zod';

export const GitReferenceSchema = z.object({
  sha: z.string(),
  branch: z.string().optional(),
  author: z.string().optional(),
  committedAt: z.string().optional(),
  message: z.string().optional(),
});
export type GitReference = z.infer<typeof GitReferenceSchema>;

export const FindingIdentifierTypeSchema = z.enum([
  'CVE',
  'CWE',
  'PACKAGE',
  'RULE',
  'SECRET_FINGERPRINT',
  'OTHER',
]);

export const FindingIdentifierSchema = z.object({
  type: FindingIdentifierTypeSchema,
  value: z.string(),
});
export type FindingIdentifier = z.infer<typeof FindingIdentifierSchema>;

export const FindingLocationSchema = z.object({
  path: z.string(),
  lineStart: z.number().int().nonnegative().optional(),
  lineEnd: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional(),
  symbol: z.string().optional(),
  // Snippet is always redacted before reaching this model.
  snippet: z.string().optional(),
});
export type FindingLocation = z.infer<typeof FindingLocationSchema>;

export const FindingSourceSchema = z.object({
  tool: z.string(),
  resultId: z.string().optional(),
  rawId: z.string().optional(),
  url: z.string().optional(),
  detectedAt: z.string().optional(),
});
export type FindingSource = z.infer<typeof FindingSourceSchema>;

export const RemediationGuidanceSchema = z.object({
  summary: z.string(),
  steps: z.array(z.string()).optional(),
  suggestedCode: z.string().optional(),
  references: z.array(z.string()).optional(),
  generatedByAI: z.boolean().default(false),
});
export type RemediationGuidance = z.infer<typeof RemediationGuidanceSchema>;
