import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@evident/config';
import { createAdapters } from './registry.js';

describe('createAdapters', () => {
  it('uses configured adapters when no CLI selection is given', () => {
    const adapters = createAdapters({
      ...DEFAULT_CONFIG,
      scanners: {
        npmAudit: { enabled: true, level: 'low' },
        semgrep: { enabled: true, config: [] },
      },
    });

    expect(adapters.map((adapter) => adapter.id)).toEqual([
      'npm-audit',
      'semgrep',
      'github-config',
    ]);
  });

  it('honors an explicit CLI scanner selection', () => {
    const adapters = createAdapters(DEFAULT_CONFIG, ['npm-audit']);
    expect(adapters.map((adapter) => adapter.id)).toEqual(['npm-audit']);
  });
});
