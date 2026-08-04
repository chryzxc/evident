import type { ResolvedConfig } from '@evident/config';
import type { RepositoryContext } from '@evident/repository';
import type { ScanOptions } from '@evident/types';
import type { Logger } from './logger.js';

export interface ScanContext {
  options: ScanOptions;
  config: ResolvedConfig;
  repository: RepositoryContext;
  logger: Logger;
  startedAt: number;
}

export function buildScanContext(
  options: ScanOptions,
  config: ResolvedConfig,
  repository: RepositoryContext,
  logger: Logger,
): ScanContext {
  return { options, config, repository, logger, startedAt: Date.now() };
}
