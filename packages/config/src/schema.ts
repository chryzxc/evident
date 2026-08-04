import { z } from 'zod';

const NpmAuditConfigSchema = z.object({
  enabled: z.boolean().default(true),
  level: z.enum(['low', 'moderate', 'high', 'critical']).default('low'),
});

const SemgrepConfigSchema = z.object({
  enabled: z.boolean().default(false),
  config: z.array(z.string()).default([]),
});

const TrivyScannerSchema = z.enum(['vuln', 'misconfig', 'secret', 'license']);
const TrivyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  scanners: z.array(TrivyScannerSchema).default(['vuln', 'misconfig', 'secret']),
});

const TrufflehogConfigSchema = z.object({
  enabled: z.boolean().default(false),
  verifiedOnly: z.boolean().default(true),
});

const ScannersConfigSchema = z
  .object({
    npmAudit: NpmAuditConfigSchema.optional(),
    semgrep: SemgrepConfigSchema.optional(),
    trivy: TrivyConfigSchema.optional(),
    trufflehog: TrufflehogConfigSchema.optional(),
  })
  .default({});

const ScanPathsSchema = z.object({
  include: z.array(z.string()).default(['**/*']),
  exclude: z
    .array(z.string())
    .default([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '.evident/**',
    ]),
});

const FailOnSchema = z.object({
  severity: z.array(z.string()).default([]),
  newFindingsOnly: z.boolean().default(false),
});

const PolicySchema = z.object({
  failOn: FailOnSchema.default({}),
});

const PrivacySchema = z.object({
  sendSourceToAI: z.boolean().default(false),
  redactSecrets: z.boolean().default(true),
  redactIdentifiers: z.boolean().default(true),
});

const ReportingSchema = z.object({
  formats: z.array(z.enum(['terminal', 'json', 'markdown', 'html', 'sarif'])).default([
    'terminal',
    'json',
  ]),
  outputDirectory: z.string().default('.evident/reports'),
});

export const EvidentConfigSchema = z.object({
  version: z.literal(1).default(1),

  project: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
    })
    .default({}),

  profiles: z.array(z.string()).default(['security']),
  frameworks: z.array(z.string()).default([]),

  scanners: ScannersConfigSchema,
  scan: ScanPathsSchema.default({}),
  policy: PolicySchema.default({}),
  privacy: PrivacySchema.default({}),
  reporting: ReportingSchema.default({}),
});

export type ResolvedConfig = z.infer<typeof EvidentConfigSchema>;

export const DEFAULT_CONFIG = EvidentConfigSchema.parse({});
