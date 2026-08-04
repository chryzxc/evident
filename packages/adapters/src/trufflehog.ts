import type { NormalizedFinding } from '@evident/types';
import type { AdapterContext, RawScannerResult } from './types.js';
import { BaseProcessAdapter } from './base.js';
import { normalizeTrufflehogJsonl } from '@evident/normalizer';

export class TrufflehogAdapter extends BaseProcessAdapter {
  id = 'trufflehog';
  displayName = 'TruffleHog';

  constructor(private readonly verifiedOnly: boolean) {
    super('trufflehog');
  }

  getArgs(_ctx: AdapterContext): string[] {
    const args = ['filesystem', '--json', '.'];
    if (this.verifiedOnly) args.push('--only-verified');
    return args;
  }

  async normalize(raw: RawScannerResult): Promise<NormalizedFinding[]> {
    return normalizeTrufflehogJsonl(raw.raw);
  }
}
