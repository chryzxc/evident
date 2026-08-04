import type { NormalizedFinding } from '@evident/types';
import type { AdapterContext, RawScannerResult } from './types.js';
import { BaseProcessAdapter } from './base.js';
import { normalizeNpmAuditJson } from '@evident/normalizer';

export class NpmAuditAdapter extends BaseProcessAdapter {
  id = 'npm-audit';
  displayName = 'npm audit';

  constructor() {
    super('npm');
  }

  getArgs(ctx: AdapterContext): string[] {
    const args = ['audit', '--json'];
    if (ctx.offline) args.push('--offline');
    return args;
  }

  async normalize(raw: RawScannerResult): Promise<NormalizedFinding[]> {
    const parsed = JSON.parse(raw.raw);
    return normalizeNpmAuditJson(parsed);
  }
}
