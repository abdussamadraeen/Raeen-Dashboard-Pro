import { Logger } from './logger';

export type Result<T, E = Error> =
  | { ok: true; value: T; error?: never }
  | { ok: false; error: E; value?: never };

export function safeCall<T>(fn: () => T, context?: string): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`safeCall failed${context ? ` [${context}]` : ''}`, error);
    return { ok: false, error };
  }
}

export async function safeCallAsync<T>(fn: () => Promise<T>, context?: string): Promise<Result<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`safeCallAsync failed${context ? ` [${context}]` : ''}`, error);
    return { ok: false, error };
  }
}

export async function safeCallOrDefault<T>(fn: () => Promise<T>, defaultValue: T, context?: string): Promise<T> {
  const result = await safeCallAsync(fn, context);
  return result.ok ? result.value : defaultValue;
}

export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok;
}
