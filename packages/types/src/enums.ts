import { z } from 'zod';

export const FindingCategorySchema = z.enum([
  'VULNERABILITY',
  'SECRET',
  'MISCONFIGURATION',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'AUDIT_LOGGING',
  'DATA_PROTECTION',
  'CI_CD',
  'EVIDENCE_GAP',
  'CONTROL_REGRESSION',
  'OTHER',
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const SeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const FindingStatusSchema = z.enum(['OPEN', 'FIXED', 'ACCEPTED', 'IGNORED', 'FALSE_POSITIVE']);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const EvidenceTypeSchema = z.enum([
  'SOURCE_CODE',
  'CONFIGURATION',
  'WORKFLOW',
  'TEST',
  'SCANNER_REPORT',
  'DOCUMENTATION',
  'GIT_CONFIGURATION',
  'BUILD_RESULT',
  'OTHER',
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const ControlRelationshipSchema = z.enum([
  'SUPPORTS',
  'PARTIALLY_SUPPORTS',
  'CONTRADICTS',
  'REQUIRES_MANUAL_EVIDENCE',
]);
export type ControlRelationship = z.infer<typeof ControlRelationshipSchema>;

export const MappingStrengthSchema = z.enum(['STRONG', 'MODERATE', 'WEAK']);
export type MappingStrength = z.infer<typeof MappingStrengthSchema>;

export const ControlEvaluationStatusSchema = z.enum([
  'TECHNICAL_EVIDENCE_FOUND',
  'PARTIAL_TECHNICAL_EVIDENCE',
  'TECHNICAL_GAP',
  'NOT_APPLICABLE',
  'MANUAL_EVIDENCE_REQUIRED',
  'NOT_EVALUATED',
]);
export type ControlEvaluationStatus = z.infer<typeof ControlEvaluationStatusSchema>;

export const FindingClassificationSchema = z.enum([
  'NEW',
  'FIXED',
  'UNCHANGED',
  'WORSENED',
  'IMPROVED',
  'EVIDENCE_ADDED',
  'EVIDENCE_REMOVED',
  'CONTROL_REGRESSION',
]);
export type FindingClassification = z.infer<typeof FindingClassificationSchema>;
