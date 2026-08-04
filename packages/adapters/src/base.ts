import type { NormalizedFinding } from '@evident/types';
import type { AdapterDetection, AdapterContext, RawScannerResult, ScannerAdapter } from './types.js';
import { spawnProcess } from './runner.js';
import { detectTool } from './detect.js';

export abstract class BaseProcessAdapter implements ScannerAdapter {
  abstract id: string;
  abstract displayName: string;

  constructor(
    protected readonly binary: string,
    protected readonly altBinary?: string,
  ) {}

  async detect(): Promise<AdapterDetection> {
    const info = await detectTool(this.binary, this.altBinary);
    return {
      available: info.available,
      path: info.path,
      version: info.version,
      reason: info.available ? undefined : `${this.binary} not found on PATH`,
    };
  }

  async prepare(_ctx: AdapterContext): Promise<void> {
  }

  abstract getArgs(ctx: AdapterContext): string[];
  abstract normalize(raw: RawScannerResult, ctx: AdapterContext): Promise<NormalizedFinding[]>;

  async run(ctx: AdapterContext): Promise<RawScannerResult> {
    const args = this.getArgs(ctx);
    const timeoutMs = ctx.timeout ?? 300_000;

    const result = await spawnProcess({
      binary: this.binary,
      args,
      cwd: ctx.root,
      timeoutMs,
    });

    return {
      adapterId: this.id,
      format: 'json',
      raw: result.stdout,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
    };
  }
}
