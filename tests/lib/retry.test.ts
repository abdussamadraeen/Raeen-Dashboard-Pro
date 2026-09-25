import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, CircuitBreaker } from '../../lib/retry';

describe('retry module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('withRetry', () => {
    it('success on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('success on 2nd attempt after 1 failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const promise = withRetry(fn, { initialDelayMs: 10, jitter: 0 });
      await vi.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws after maxAttempts exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      
      const promise = withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, jitter: 0 });
      promise.catch(() => {}); // Prevent unhandled rejection warning
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('respects delay timing', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      
      const promise = withRetry(fn, { initialDelayMs: 100, backoffMultiplier: 2, jitter: 0 });
      promise.catch(() => {}); // Prevent unhandled rejection warning
      
      // first failure, waiting 100ms
      await vi.advanceTimersToNextTimerAsync();
      expect(fn).toHaveBeenCalledTimes(2);
      
      // second failure, waiting 200ms
      await vi.advanceTimersToNextTimerAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('CircuitBreaker', () => {
    it('starts CLOSED', () => {
      const cb = new CircuitBreaker();
      expect(cb.currentState).toBe('closed');
    });

    it('opens after failureThreshold failures', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      
      await expect(cb.call(failFn)).rejects.toThrow();
      expect(cb.currentState).toBe('closed');
      
      await expect(cb.call(failFn)).rejects.toThrow();
      expect(cb.currentState).toBe('open');
    });

    it('transitions to HALF-OPEN after resetTimeout', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      
      await expect(cb.call(failFn)).rejects.toThrow();
      expect(cb.currentState).toBe('open');
      
      vi.advanceTimersByTime(1000);
      
      // We need to call it to trigger the transition to half-open and see it fail or succeed
      const successFn = vi.fn().mockResolvedValue('success');
      const result = await cb.call(successFn);
      expect(result).toBe('success');
      // After success it goes to closed
      expect(cb.currentState).toBe('closed');
    });

    it('closes on successful half-open call', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      
      await expect(cb.call(failFn)).rejects.toThrow();
      
      vi.advanceTimersByTime(1000);
      
      const successFn = vi.fn().mockResolvedValue('success');
      await cb.call(successFn);
      
      expect(cb.currentState).toBe('closed');
    });

    it('fallback called when OPEN', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const fallbackFn = vi.fn().mockReturnValue('fallback');
      
      await expect(cb.call(failFn)).rejects.toThrow();
      
      const result = await cb.call(failFn, fallbackFn);
      expect(result).toBe('fallback');
      expect(fallbackFn).toHaveBeenCalled();
    });
  });
});
