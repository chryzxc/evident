export class ExitCodeError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ExitCodeError';
  }
}
