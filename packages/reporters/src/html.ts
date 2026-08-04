import type { ScanResult, Severity } from '@evident/types';
import { SEVERITY_ORDER } from '@evident/types';
import type { Reporter } from './types.js';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sevClass(s: Severity): string {
  const map: Record<Severity, string> = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFORMATIONAL: 'info',
  };
  return map[s] ?? 'info';
}

export const htmlReporter: Reporter = {
  format: 'html',
  render(result: ScanResult): string {
    const findings = [...result.findings].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );

    const rows = findings
      .map(
        (f) =>
          `<tr class="${sevClass(f.severity)}"><td>${esc(f.id)}</td><td class="sev sev-${sevClass(f.severity)}">${esc(f.severity)}</td><td><strong>${esc(f.title)}</strong><br><small>${esc(f.description)}</small></td><td>${esc(f.category)}</td><td>${esc(f.locations[0]?.path ?? 'repository')}${f.locations[0]?.lineStart ? `:${f.locations[0].lineStart}` : ''}</td><td>${f.sources.map((s) => esc(s.tool)).join(', ')}</td></tr>`,
      )
      .join('\n');

    const controlRows = result.controls
      .map(
        (control) =>
          `<tr><td>${esc(control.framework.toUpperCase())}</td><td>${esc(control.controlId)}</td><td>${esc(control.status)}</td><td>${control.findingIds.length}</td><td>${control.evidenceIds.length}</td></tr>`,
      )
      .join('\n');

    const evidenceRows = result.evidence
      .map(
        (evidence) => `<li><strong>${esc(evidence.type)}</strong> ${esc(evidence.path ?? evidence.title)}</li>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Evident Scan — ${esc(result.repository.name)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#1a1a2e}
h1{border-bottom:2px solid #e0e0e0;padding-bottom:.5rem}
.summary{display:flex;gap:2rem;margin:1rem 0}
.summary div{background:#f5f5f5;padding:1rem;border-radius:6px;min-width:120px}
.summary .label{font-size:.8rem;color:#666}
.summary .value{font-size:1.5rem;font-weight:700}
table{width:100%;border-collapse:collapse;margin:1rem 0}
th{background:#f5f5f5;text-align:left;padding:.5rem;border-bottom:1px solid #e0e0e0}
td{padding:.5rem;border-bottom:1px solid #eee}
.sev{font-weight:700;text-align:center}
.sev-critical{color:#dc2626}.sev-high{color:#ea580c}.sev-medium{color:#ca8a04}.sev-low{color:#2563eb}.sev-info{color:#6b7280}
tr.critical{background:#fef2f2}tr.high{background:#fff7ed}tr.medium{background:#fefce8}
.footer{margin-top:2rem;font-size:.8rem;color:#888}
</style></head>
<body>
<h1>Evident Scan Report</h1>
<div class="summary">
  <div><span class="label">Repository</span><br><span class="value">${esc(result.repository.name)}</span></div>
  <div><span class="label">Commit</span><br><span class="value">${esc(result.repository.git?.sha?.slice(0, 7) ?? 'N/A')}</span></div>
  <div><span class="label">Findings</span><br><span class="value">${result.findings.length}</span></div>
  <div><span class="label">Exit</span><br><span class="value">${result.exitCode}</span></div>
</div>
<h2>Findings</h2>
<table><thead><tr><th>ID</th><th>Severity</th><th>Finding</th><th>Category</th><th>Location</th><th>Sources</th></tr></thead><tbody>
${rows || '<tr><td colspan="6">No findings</td></tr>'}
</tbody></table>
<h2>Scanner Coverage</h2>
<p>${result.coverage.complete ? 'Complete' : 'Incomplete'}${result.coverage.missingTools.length ? `; unavailable: ${esc(result.coverage.missingTools.join(', '))}` : ''}</p>
<h2>Technical Control Evaluations</h2>
<table><thead><tr><th>Framework</th><th>Control</th><th>Status</th><th>Findings</th><th>Evidence</th></tr></thead><tbody>
${controlRows || '<tr><td colspan="5">No framework evaluation requested</td></tr>'}
</tbody></table>
<h2>Evidence</h2>
<ul>${evidenceRows || '<li>No technical evidence discovered</li>'}</ul>
<div class="footer">Generated at ${esc(result.generatedAt)} · Profiles: ${esc(result.profiles.join(', '))} · ${result.durationMs}ms</div>
</body></html>`;
  },
};
