import type { ScanResult } from '@evident/types';
import type { Reporter } from './types.js';

export const jsonReporter: Reporter = {
  format: 'json',
  render(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  },
};
