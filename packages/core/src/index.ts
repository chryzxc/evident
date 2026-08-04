export { scanRepository, type ScanHooks, DEFAULT_HOOKS } from './orchestrator.js';
export { computeExitCode, EXIT, type ExitCodeInput } from './exit-code.js';
export { ExitCodeError } from './errors.js';
export { createLogger, type Logger, type LogLevel } from './logger.js';
export type { ScanContext } from './context.js';
export { buildScanResult, toRepositorySummary } from './result.js';
