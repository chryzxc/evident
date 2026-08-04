import { z } from 'zod';
import { EvidentFindingSchema } from './finding.js';
import { EvidenceReferenceSchema } from './evidence.js';
import { ControlEvaluationSchema } from './controls.js';
import { FindingClassificationSchema } from './enums.js';

export const AdapterStatusSchema = z.enum(['ran', 'skipped', 'failed', 'unavailable', 'timed_out']);
export type AdapterStatus = z.infer<typeof AdapterStatusSchema>;

export const AdapterRunSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: AdapterStatusSchema,
  version: z.string().optional(),
  durationMs: z.number().nonnegative(),
  required: z.boolean().default(false),
  message: z.string().optional(),
});
export type AdapterRun = z.infer<typeof AdapterRunSchema>;

export const RegressionItemSchema = z.object({
  findingId: z.string(),
  fingerprint: z.string(),
  classification: FindingClassificationSchema,
  details: z.string().optional(),
});
export type RegressionItem = z.infer<typeof RegressionItemSchema>;

export const RepositoryGitSchema = z.object({
  sha: z.string(),
  branch: z.string().optional(),
  isDirty: z.boolean().default(false),
  remotes: z.array(z.string()).default([]),
});
export type RepositoryGit = z.infer<typeof RepositoryGitSchema>;

export const RepositorySummarySchema = z.object({
  name: z.string(),
  root: z.string(),
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  packageManagers: z.array(z.string()).default([]),
  isMonorepo: z.boolean().default(false),
  git: RepositoryGitSchema.optional(),
});
export type RepositorySummary = z.infer<typeof RepositorySummarySchema>;

export const ScanCoverageSchema = z.object({
  complete: z.boolean().default(true),
  partial: z.boolean().default(false),
  missingTools: z.array(z.string()).default([]),
});
export type ScanCoverage = z.infer<typeof ScanCoverageSchema>;

/**
 * Canonical scan result. This object IS the JSON report and the audit trail.
 */
export const ScanResultSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  repository: RepositorySummarySchema,
  profiles: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),

  findings: z.array(EvidentFindingSchema).default([]),
  evidence: z.array(EvidenceReferenceSchema).default([]),
  controls: z.array(ControlEvaluationSchema).default([]),

  adapters: z.array(AdapterRunSchema).default([]),
  regression: z.array(RegressionItemSchema).default([]),

  coverage: ScanCoverageSchema,
  durationMs: z.number().nonnegative(),
  exitCode: z.number().int(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

export const ScanModeSchema = z.enum(['full', 'native-only', 'changed-only']);
export type ScanMode = z.infer<typeof ScanModeSchema>;

export interface ScanOptions {
  root: string;
  profiles?: string[];
  frameworks?: string[];
  scanners?: string[];
  mode?: ScanMode;
  formats?: string[];
  outputDirectory?: string;
  failOn?: {
    severity?: string[];
    newFindingsOnly?: boolean;
  };
  base?: string;
  ci?: boolean;
  offline?: boolean;
  useAi?: boolean;
  timeout?: number;
  configPath?: string;
  configOverrides?: Record<string, unknown>;
  logLevel?: 'silent' | 'info' | 'debug' | 'warn' | 'error';
}
