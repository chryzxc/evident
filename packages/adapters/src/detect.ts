import { spawnProcess } from './runner.js';

export interface ToolInfo {
  binary: string;
  path?: string;
  version?: string;
  available: boolean;
}

const VERSION_PATTERNS: Record<string, RegExp> = {
  npm: /^(\d[\d.]*)/m,
  semgrep: /^(\d[\d.]*)/m,
  trivy: /Version:\s*(\d[\d.]*)/,
  trufflehog: /^trufflehog\s+(\d[\d.]*)/,
};

export async function detectTool(binary: string, altBinary?: string): Promise<ToolInfo> {
  const binaries = [binary, ...(altBinary ? [altBinary] : [])];

  let found: string | undefined;
  for (const b of binaries) {
    const which = await spawnProcess({
      binary: 'which',
      args: [b],
      timeoutMs: 5_000,
    });
    if (which.exitCode === 0 && which.stdout.trim()) {
      found = b;
      break;
    }
  }

  const toolStr = found ?? binary;
  if (!found) {
    return { binary: toolStr, available: false };
  }

  const version = await getVersion(toolStr);
  return { binary: toolStr, path: found, version, available: true };
}

async function getVersion(binary: string): Promise<string | undefined> {
  const result = await spawnProcess({
    binary,
    args: ['--version'],
    timeoutMs: 10_000,
  });

  if (result.exitCode !== 0) return undefined;

  const output = (result.stdout || result.stderr).trim();
  const pattern = VERSION_PATTERNS[binary];
  if (pattern) {
    const m = pattern.exec(output);
    if (m?.[1]) return m[1];
  }

  const fallback = /(\d+\.\d+\.\d+)/.exec(output);
  return fallback?.[1] ?? output.slice(0, 32);
}
