import type { ResolvedConfig } from '@evident/config';
import type { ScannerAdapter } from './types.js';
import { NpmAuditAdapter } from './npm-audit.js';
import { GitHubConfigAdapter } from './github-config.js';
import { SemgrepAdapter } from './semgrep.js';
import { TrivyAdapter } from './trivy.js';
import { TrufflehogAdapter } from './trufflehog.js';

export function createAdapters(config: ResolvedConfig, selected?: string[]): ScannerAdapter[] {
  const adapters: ScannerAdapter[] = [];
  const scanners = config.scanners;

  if (scanners?.npmAudit?.enabled !== false) {
    adapters.push(new NpmAuditAdapter());
  }
  if (scanners?.semgrep?.enabled === true) {
    adapters.push(new SemgrepAdapter(config.scanners?.semgrep?.config ?? []));
  }
  if (scanners?.trivy?.enabled === true) {
    adapters.push(new TrivyAdapter(config.scanners?.trivy?.scanners ?? []));
  }
  if (scanners?.trufflehog?.enabled === true) {
    adapters.push(new TrufflehogAdapter(config.scanners?.trufflehog?.verifiedOnly ?? true));
  }

  adapters.push(new GitHubConfigAdapter());

  if (!selected || selected.length === 0) return adapters;

  const requested = new Set(selected.map((id) => id.trim().toLowerCase()));
  return adapters.filter((adapter) => requested.has(adapter.id));
}
