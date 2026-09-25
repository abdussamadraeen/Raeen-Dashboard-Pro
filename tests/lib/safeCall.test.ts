import { describe, it, expect } from 'vitest';
import { safeCall, safeCallAsync, safeCallOrDefault, isOk } from '../../lib/safeCall';

describe('safeCall module', () => {
  describe('safeCall', () => {
    it('returns {ok:true, value} on success', () => {
      const result = safeCall(() => 'success');
      expect(result).toEqual({ ok: true, value: 'success' });
    });

    it('returns {ok:false, error} on throw', () => {
      const err = new Error('fail');
      const result = safeCall(() => { throw err; });
      expect(result).toEqual({ ok: false, error: err });
    });
  });

  describe('safeCallAsync', () => {
    it('resolves {ok:true} on success', async () => {
      const result = await safeCallAsync(async () => 'success');
      expect(result).toEqual({ ok: true, value: 'success' });
    });

    it('resolves {ok:false} on rejection', async () => {
      const err = new Error('fail');
      const result = await safeCallAsync(async () => { throw err; });
      expect(result).toEqual({ ok: false, error: err });
    });
  });

  describe('safeCallOrDefault', () => {
    it('returns value on success', async () => {
      const result = await safeCallOrDefault(async () => 'success', 'default');
      expect(result).toBe('success');
    });

    it('returns default on failure', async () => {
      const result = await safeCallOrDefault(async () => { throw new Error('fail'); }, 'default');
      expect(result).toBe('default');
    });
  });

  describe('isOk', () => {
    it('typeguard works correctly', () => {
      const successResult = { ok: true as const, value: 'success' };
      const failResult = { ok: false as const, error: new Error('fail') };

      expect(isOk(successResult)).toBe(true);
      expect(isOk(failResult)).toBe(false);
    });
  });
});
