export class ConfigError extends Error {
  readonly exitCode = 2;
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}
