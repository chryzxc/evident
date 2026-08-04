import type { NormalizedFinding } from '@evident/types';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterContext, AdapterDetection, RawScannerResult, ScannerAdapter } from './types.js';

export class GitHubConfigAdapter implements ScannerAdapter {
  id = 'github-config';
  displayName = 'GitHub Configuration';

  async detect(): Promise<AdapterDetection> {
    return { available: true };
  }

  async prepare(): Promise<void> {}

  async run(ctx: AdapterContext): Promise<RawScannerResult> {
    const root = ctx.root;
    const config: Record<string, unknown> = {};

    const files = [
      '.github/workflows',
      '.github/dependabot.yml',
      '.github/dependabot.yaml',
      'SECURITY.md',
      'CODEOWNERS',
      '.github/PULL_REQUEST_TEMPLATE.md',
      'CODE_OF_CONDUCT.md',
      'CONTRIBUTING.md',
    ];

    for (const f of files) {
      const path = join(root, f);
      if (existsSync(path)) {
        const stat = await import('node:fs/promises').then((m) => m.stat(path));
        if (f.endsWith('/workflows') && stat.isDirectory()) {
          const entries = await import('node:fs/promises').then((m) => m.readdir(path));
          const yamls = entries.filter(
            (e: string) => e.endsWith('.yml') || e.endsWith('.yaml'),
          );
          const contents: Record<string, string> = {};
          for (const wf of yamls) {
            contents[wf] = readFileSync(join(path, wf), 'utf8');
          }
          config.workflows = contents;
        } else {
          config[f] = readFileSync(path, 'utf8');
        }
      }
    }

    return {
      adapterId: this.id,
      format: 'config',
      raw: JSON.stringify(config),
      stdout: JSON.stringify(config),
      stderr: '',
      exitCode: 0,
      durationMs: 0,
      timedOut: false,
    };
  }

  async normalize(raw: RawScannerResult): Promise<NormalizedFinding[]> {
    const config = JSON.parse(raw.raw) as Record<string, unknown>;
    const findings: NormalizedFinding[] = [];
    const now = new Date().toISOString();

    const push = (title: string, description: string, path: string, category: NormalizedFinding['category']) => {
      findings.push({
        id: `EVD-gh-${findings.length}`,
        fingerprint: `gh-${path}`,
        title,
        description,
        category,
        severity: 'INFORMATIONAL',
        confidence: 'HIGH',
        status: 'OPEN',
        sources: [{ tool: this.id, detectedAt: now }],
        locations: [{ path }],
        identifiers: [],
        mappings: [],
        evidence: [],
        firstSeenAt: now,
        lastSeenAt: now,
      });
    };

    if (config.workflows) {
      const wfFiles = config.workflows as Record<string, string>;
      for (const [name, content] of Object.entries(wfFiles)) {
        const path = `.github/workflows/${name}`;
        if (containsUnpinnedAction(content)) {
          push(
            `Unpinned GitHub Action in ${name}`,
            `Workflow uses a GitHub Action without a pinned version hash`,
            path,
            'CI_CD',
          );
        }
      }
    }

    return findings;
  }
}

function containsUnpinnedAction(content: string): boolean {
  const uses = /\buses:\s*[^\s@]+@([^\s#]+)/g;
  let match: RegExpExecArray | null;
  while ((match = uses.exec(content)) !== null) {
    if (!/^[a-f0-9]{40}$/i.test(match[1] ?? '')) return true;
  }
  return false;
}
