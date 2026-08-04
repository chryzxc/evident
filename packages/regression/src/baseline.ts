import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RegressionItem, EvidentFinding, ScanResult } from '@evident/types';

export interface Baseline {
  createdAt: string;
  repository: string;
  commitSha?: string;
  fingerprints: Array<{ fingerprint: string; severity: string; category: string; title: string }>;
}

export async function createBaseline(
  from: Pick<ScanResult, 'findings' | 'repository'>,
  outputDir: string,
): Promise<Baseline> {
  const baseline: Baseline = {
    createdAt: new Date().toISOString(),
    repository: from.repository.name,
    commitSha: from.repository.git?.sha,
    fingerprints: from.findings.map((f) => ({
      fingerprint: f.fingerprint,
      severity: f.severity,
      category: f.category,
      title: f.title.slice(0, 120),
    })),
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'baseline.json'), JSON.stringify(baseline, null, 2), 'utf8');

  return baseline;
}

export async function loadBaseline(outputDir: string): Promise<Baseline | undefined> {
  try {
    const raw = await readFile(join(outputDir, 'baseline.json'), 'utf8');
    return JSON.parse(raw) as Baseline;
  } catch {
    return undefined;
  }
}

export function classifyFindings(
  findings: EvidentFinding[],
  baseline?: Baseline,
): RegressionItem[] {
  if (!baseline) return [];

  const prev = new Set(baseline.fingerprints.map((f) => f.fingerprint));
  const prevBySev = new Map(baseline.fingerprints.map((f) => [f.fingerprint, f.severity]));
  const curr = new Map(findings.map((f) => [f.fingerprint, f]));

  const items: RegressionItem[] = [];

  for (const f of findings) {
    if (!prev.has(f.fingerprint)) {
      items.push({ findingId: f.id, fingerprint: f.fingerprint, classification: 'NEW' });
    } else {
      items.push({ findingId: f.id, fingerprint: f.fingerprint, classification: 'UNCHANGED' });
    }
  }

  for (const fp of prev) {
    if (!curr.has(fp)) {
      items.push({
        findingId: fp,
        fingerprint: fp,
        classification: 'FIXED',
        details: `Previously: ${prevBySev.get(fp) ?? 'unknown'}`,
      });
    }
  }

  return items;
}
