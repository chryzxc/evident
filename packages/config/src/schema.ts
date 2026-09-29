import { z } from 'zod';

const NpmAuditConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    level: z.enum(['low', 'moderate', 'high', 'critical']).default('low'),
    required: z.boolean().default(false),
  })
  .strict();

const SemgrepConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    config: z.array(z.string()).default([]),
    required: z.boolean().default(false),
  })
  .strict();

const TrivyScannerSchema = z.enum(['vuln', 'misconfig', 'secret', 'license']);
const TrivyConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    scanners: z.array(TrivyScannerSchema).default(['vuln', 'misconfig', 'secret']),
    required: z.boolean().default(false),
  })
  .strict();

const TrufflehogConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    verifiedOnly: z.boolean().default(true),
    required: z.boolean().default(false),
  })
  .strict();

const ScannersConfigSchema = z
  .object({
    npmAudit: NpmAuditConfigSchema.default({}),
    semgrep: SemgrepConfigSchema.default({}),
    trivy: TrivyConfigSchema.default({}),
    trufflehog: TrufflehogConfigSchema.default({}),
  })
  .strict()
  .default({});

const ScanPathsSchema = z
  .object({
    include: z.array(z.string()).default(['**/*']),
    exclude: z
      .array(z.string())
      .default(['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**', '.evident/**']),
  })
  .strict();

const FailOnSchema = z
  .object({
    severity: z.array(z.enum(['informational', 'low', 'medium', 'high', 'critical'])).default([]),
    newFindingsOnly: z.boolean().default(false),
  })
  .strict();

const PolicySchema = z
  .object({
    failOn: FailOnSchema.default({}),
  })
  .strict();

const PrivacySchema = z
  .object({
    sendSourceToAI: z.boolean().default(false),
    redactSecrets: z.boolean().default(true),
    redactIdentifiers: z.boolean().default(true),
  })
  .strict();

const ReportingSchema = z
  .object({
    formats: z
      .array(z.enum(['terminal', 'json', 'markdown', 'html', 'sarif']))
      .default(['terminal', 'json']),
    outputDirectory: z.string().default('.evident/reports'),
  })
  .strict();

const CacheSchema = z
  .object({
    enabled: z.boolean().default(true),
    preserveRawOutput: z.boolean().default(false),
    directory: z.string().min(1).default('.evident/cache'),
  })
  .strict();

export const EvidentConfigSchema = z
  .object({
    version: z.literal(1).default(1),

    project: z
      .object({
        name: z.string().optional(),
        type: z.string().optional(),
      })
      .strict()
      .default({}),

    profiles: z.array(z.enum(['security', 'soc2', 'hipaa', 'owasp'])).default(['security']),
    frameworks: z.array(z.literal('soc2')).default([]),

    scanners: ScannersConfigSchema,
    scan: ScanPathsSchema.default({}),
    policy: PolicySchema.default({}),
    privacy: PrivacySchema.default({}),
    reporting: ReportingSchema.default({}),
    cache: CacheSchema.default({}),
  })
  .strict();

export type ResolvedConfig = z.infer<typeof EvidentConfigSchema>;

export const DEFAULT_CONFIG = EvidentConfigSchema.parse({});
