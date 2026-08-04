export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  level: LogLevel;
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export function createLogger(level: LogLevel = 'info'): Logger {
  return {
    level,
    debug(msg, ...args) {
      if (ORDER[level] <= ORDER.debug) console.error('[debug]', msg, ...args);
    },
    info(msg, ...args) {
      if (ORDER[level] <= ORDER.info) console.error('[info]', msg, ...args);
    },
    warn(msg, ...args) {
      if (ORDER[level] <= ORDER.warn) console.error('[warn]', msg, ...args);
    },
    error(msg, ...args) {
      if (ORDER[level] <= ORDER.error) console.error('[error]', msg, ...args);
    },
  };
}
