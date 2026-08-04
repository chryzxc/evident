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

      if (raw.timedOut) {
        adapterRuns.push({
          id: adapter.id,
          displayName: adapter.displayName,
          status: 'timed_out',
          required: adapter.required ?? false,
          version: detection.version,
          durationMs: raw.durationMs,
          message: `Timed out after ${ctx.timeout ?? 300_000}ms`,
        });
        continue;
      }

      if (raw.exitCode !== 0 && raw.stdout.trim().length === 0) {
        adapterRuns.push({
          id: adapter.id,
          displayName: adapter.displayName,
          status: 'failed',
          required: adapter.required ?? false,
          version: detection.version,
          durationMs: raw.durationMs,
          message: raw.stderr || `Exited with code ${raw.exitCode}`,
        });
        continue;
      }

      const findings = await adapter.normalize(raw, ctx);
      allFindings.push(...findings);

      adapterRuns.push({
        id: adapter.id,
        displayName: adapter.displayName,
        status: 'ran',
        required: adapter.required ?? false,
        version: detection.version,
        durationMs: raw.durationMs,
        message: raw.exitCode === 0 ? undefined : `Exited with code ${raw.exitCode} after producing parseable output`,
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
