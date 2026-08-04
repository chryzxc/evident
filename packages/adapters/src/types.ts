import type { ResolvedConfig } from '@evident/config';
import type { RepositoryContext } from '@evident/repository';
import type { NormalizedFinding } from '@evident/types';

export interface AdapterContext {
  root: string;
  repository: RepositoryContext;
  config: ResolvedConfig;
  offline: boolean;
  timeout?: number;
}

export interface AdapterDetection {
  available: boolean;
  path?: string;
  version?: string;
  reason?: string;
}

export interface RawScannerResult {
  adapterId: string;
  format: 'json' | 'sarif' | 'jsonl' | 'text' | 'config';
  raw: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface ScannerAdapter {
  id: string;
  displayName: string;
  required?: boolean;

  detect(repository: RepositoryContext): Promise<AdapterDetection>;
  prepare(ctx: AdapterContext): Promise<void>;
  run(ctx: AdapterContext): Promise<RawScannerResult>;
  normalize(
    raw: RawScannerResult,
    ctx: AdapterContext,
  ): Promise<NormalizedFinding[]>;
}
