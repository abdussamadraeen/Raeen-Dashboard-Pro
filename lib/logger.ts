import type { AppError } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: unknown;
}

const RING_SIZE = 200;
const ring: LogEntry[] = [];
let ringHead = 0;

const push = (entry: LogEntry) => {
  ring[ringHead % RING_SIZE] = entry;
  ringHead++;
};

export const Logger = {
  debug(message: string, context?: unknown): void {
    push({ level: 'debug', message, timestamp: Date.now(), context });
    console.debug(`[App:debug] ${message}`, context ?? '');
  },

  info(message: string, context?: unknown): void {
    push({ level: 'info', message, timestamp: Date.now(), context });
    console.info(`[App:info] ${message}`, context ?? '');
  },

  warn(message: string, context?: unknown): void {
    push({ level: 'warn', message, timestamp: Date.now(), context });
    console.warn(`[App:warn] ${message}`, context ?? '');
  },

  error(message: string, errorOrContext?: AppError | Error | unknown): void {
    push({ level: 'error', message, timestamp: Date.now(), context: errorOrContext });
    console.error(`[App:error] ${message}`, errorOrContext ?? '');
  },

  dump(count = 50): LogEntry[] {
    const total = Math.min(ringHead, RING_SIZE);
    const result: LogEntry[] = [];
    for (let i = Math.max(0, total - count); i < total; i++) {
      const entry = ring[i % RING_SIZE];
      if (entry) result.push(entry);
    }
    return result;
  },
};
