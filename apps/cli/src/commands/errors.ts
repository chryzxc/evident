import pc from 'picocolors';

export function handleError(err: unknown): never {
  const e = err as Record<string, unknown>;

  if (e?.name === 'ConfigError' && typeof e?.exitCode === 'number') {
    process.stderr.write(pc.red(`${e?.message ?? 'Invalid configuration'}\n`));
    process.exit(e.exitCode as number);
  }
  if (e?.name === 'ExitCodeError' && typeof e?.exitCode === 'number') {
    process.stderr.write(pc.red(`${e?.message ?? 'Internal error'}\n`));
    process.exit(e.exitCode as number);
  }

  process.stderr.write(pc.red(`${e?.message ?? String(e)}\n`));
  process.exit(5);
}
