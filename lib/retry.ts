import { Logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 300,
    maxDelayMs = 10_000,
    backoffMultiplier = 2,
    jitter = 0.15,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;

      const baseDelay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      const jitterAmount = baseDelay * jitter * (Math.random() * 2 - 1);
      const delay = Math.max(0, baseDelay + jitterAmount);

      Logger.warn(`Retry attempt ${attempt}/${maxAttempts - 1} in ${Math.round(delay)}ms`, err);
      onRetry?.(attempt, err);

      await new Promise<void>(res => setTimeout(res, delay));
    }
  }

  throw lastError;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.name = options.name ?? 'unknown';
  }

  get currentState(): CircuitState {
    return this.state;
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        Logger.info(`[CircuitBreaker:${this.name}] Transitioning to HALF-OPEN`);
      } else {
        Logger.warn(`[CircuitBreaker:${this.name}] OPEN - fast failing`);
        if (fallback) return fallback();
        throw new Error(`CircuitBreaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state !== 'closed') {
      Logger.info(`[CircuitBreaker:${this.name}] Recovered to CLOSED`);
    }
    this.state = 'closed';
  }

  private onFailure(err: unknown): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    Logger.error(`[CircuitBreaker:${this.name}] Failure #${this.failures}`, err);
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      Logger.error(`[CircuitBreaker:${this.name}] Tripped to OPEN after ${this.failures} failures`);
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
