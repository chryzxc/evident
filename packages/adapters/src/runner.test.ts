import { describe, expect, it } from 'vitest';
import { spawnProcess } from './runner.js';

describe('spawnProcess', () => {
  it('reports a missing binary without throwing', async () => {
    const result = await spawnProcess({
      binary: 'evident-missing-binary',
      args: [],
      timeoutMs: 100,
    });

    expect(result.exitCode).toBe(127);
    expect(result.timedOut).toBe(false);
  });

  it('terminates a process that exceeds its timeout', async () => {
    const result = await spawnProcess({
      binary: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 1000)'],
      timeoutMs: 20,
    });

    expect(result.timedOut).toBe(true);
  });
});
