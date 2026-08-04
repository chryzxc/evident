import { scanRepository } from '@evident/core';
import { createAdapters, runAllAdapters, type AdapterContext } from '@evident/adapters';
import type { ScanOptions, ScanResult } from '@evident/types';

export function runConfiguredScan(options: ScanOptions): Promise<ScanResult> {
  return scanRepository(options, {
    runAdapters: async (ctx: AdapterContext) => {
      const adapters = createAdapters(ctx.config, options.scanners);
      return runAllAdapters(adapters, ctx);
    },
  });
}
