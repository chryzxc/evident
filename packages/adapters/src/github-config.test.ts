import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '@evident/config';
import { detectRepository } from '@evident/repository';
import { GitHubConfigAdapter } from './github-config.js';

describe('GitHubConfigAdapter', () => {
  it('reports unpinned GitHub Actions without duplicating native presence rules', async () => {
    const root = await mkdtemp(join(tmpdir(), 'evident-github-config-'));
    try {
      await mkdir(join(root, '.github', 'workflows'), { recursive: true });
      await writeFile(join(root, 'package.json'), '{"name":"fixture"}');
      await writeFile(
        join(root, '.github', 'workflows', 'ci.yml'),
        'steps:\n  - uses: actions/checkout@v4\n',
      );
      const repository = await detectRepository({ root });
      const adapter = new GitHubConfigAdapter();
      const raw = await adapter.run({
        root,
        repository,
        config: DEFAULT_CONFIG,
        offline: false,
      });
      const findings = await adapter.normalize(raw);

      expect(findings).toHaveLength(1);
      expect(findings[0]?.title).toContain('Unpinned GitHub Action');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
