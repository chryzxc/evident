import { spawn } from 'node:child_process';

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface SpawnOptions {
  binary: string;
  args: string[];
  cwd?: string;
  timeoutMs?: number;
}

export function spawnProcess(opts: SpawnOptions): Promise<SpawnResult> {
  const started = Date.now();
  const { binary, args, cwd, timeoutMs = 300_000 } = opts;

  return new Promise<SpawnResult>((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        resolve({
          stdout: '',
          stderr: `${binary}: command not found`,
          exitCode: 127,
          durationMs: Date.now() - started,
          timedOut: false,
        });
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        durationMs: Date.now() - started,
        timedOut,
      });
    });
  });
}
