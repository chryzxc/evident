import type { AdapterRun, NormalizedFinding } from '@evident/types';
import type { AdapterContext, ScannerAdapter } from './types.js';

export interface AdapterRunResult {
  adapterRuns: AdapterRun[];
  findings: NormalizedFinding[];
}

export async function runAllAdapters(
  adapters: ScannerAdapter[],
  ctx: AdapterContext,
): Promise<AdapterRunResult> {
  const adapterRuns: AdapterRun[] = [];
  const allFindings: NormalizedFinding[] = [];

  for (const adapter of adapters) {
    const started = Date.now();
    try {
      const detection = await adapter.detect(ctx.repository);
      if (!detection.available) {
        adapterRuns.push({
          id: adapter.id,
          displayName: adapter.displayName,
          status: 'unavailable',
          required: adapter.required ?? false,
          version: detection.version,
          durationMs: Date.now() - started,
          message: detection.reason,
        });
        continue;
      }

      await adapter.prepare(ctx);
      const raw = await adapter.run(ctx);

      const findings = await adapter.normalize(raw, ctx);
      allFindings.push(...findings);

      adapterRuns.push({
        id: adapter.id,
        displayName: adapter.displayName,
        status: 'ran',
        required: adapter.required ?? false,
        version: detection.version,
        durationMs: raw.durationMs,
      });
    } catch (err) {
      adapterRuns.push({
        id: adapter.id,
        displayName: adapter.displayName,
        status: 'failed',
        required: adapter.required ?? false,
        durationMs: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { adapterRuns, findings: allFindings };
}
