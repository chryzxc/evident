import pc from 'picocolors';
import type { Severity } from '@evident/types';
import type { Reporter } from './types.js';
import { summarize } from './types.js';
import { SEVERITY_ORDER } from '@evident/types';

const severityColor: Record<Severity, (s: string) => string> = {
  CRITICAL: pc.red,
  HIGH: pc.red,
  MEDIUM: pc.yellow,
  LOW: pc.blue,
  INFORMATIONAL: pc.gray,
};

function newSection(counts: Record<string, number>): string[] {
  const lines: string[] = [];
  for (const sev of SEVERITY_ORDER) {
    const n = counts[sev] ?? 0;
    if (n > 0) lines.push(`  ${n} ${sev.toLowerCase()}`);
  }
  return lines;
}

export const terminalReporter: Reporter = {
  format: 'terminal',
  render(result): string {
    const counts = summarize(result);
    const lines: string[] = [];

    lines.push(pc.bold('Evident Scan'));
    lines.push('');
    lines.push(`${pc.dim('Repository:')}`);
    lines.push(`  ${result.repository.name}`);
    if (result.repository.git?.sha) {
      lines.push(`${pc.dim('Commit:')}`);
      lines.push(`  ${result.repository.git.sha.slice(0, 7)}`);
    }
    lines.push('');

    const newLines = newSection(counts.newBySeverity);
    if (newLines.length > 0) {
      lines.push(pc.bold('New findings:'));
      lines.push(...newLines);
    } else {
      lines.push(pc.green('No new findings.'));
    }
    lines.push('');

    if (counts.fixed > 0) {
      lines.push(pc.green(`Fixed findings: ${counts.fixed}`));
    }

    if (counts.controlRegressions > 0) {
      lines.push(pc.red(`Technical-control regressions: ${counts.controlRegressions}`));
    }

    if (!result.coverage.complete) {
      lines.push('');
      lines.push(pc.yellow('Coverage incomplete.'));
      if (result.coverage.missingTools.length > 0) {
        lines.push(`  Missing tools: ${result.coverage.missingTools.join(', ')}`);
      }
    }

    const blocking = result.findings.filter((f) => f.status === 'OPEN').length;
    lines.push('');
    lines.push(pc.dim(`Profiles: ${result.profiles.join(', ') || 'none'}`));
    lines.push(pc.dim(`Duration: ${result.durationMs}ms · Findings: ${counts.total} · Blocking: ${blocking}`));

    if (result.exitCode !== 0) {
      lines.push(pc.red(`Exit code: ${result.exitCode}`));
    }

    return lines.join('\n');
  },
};

export { severityColor };
