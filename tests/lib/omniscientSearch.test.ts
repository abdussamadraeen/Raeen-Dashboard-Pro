import { describe, it, expect } from 'vitest';
import {
  BoundedLRUCache,
  evaluateExpression,
  SLASH_COMMANDS,
  queryOmniscientSearch,
  searchLocalNotesAndApps,
} from '../../lib/omniscientSearch';

describe('Omniscient Search Engine ("Search Like God")', () => {
  describe('BoundedLRUCache (Rust-style zero-leak cache)', () => {
    it('sets and gets values correctly', () => {
      const cache = new BoundedLRUCache<string, string>(3);
      cache.set('a', 'alpha');
      cache.set('b', 'beta');
      expect(cache.get('a')).toBe('alpha');
      expect(cache.get('b')).toBe('beta');
      expect(cache.get('c')).toBeUndefined();
    });

    it('evicts least recently used items when capacity is exceeded', () => {
      const cache = new BoundedLRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // Access 'a', making 'b' the least recently used
      cache.get('a');
      // Add 'd', which should evict 'b'
      cache.set('d', 4);

      expect(cache.has('b')).toBe(false);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
      expect(cache.size).toBe(3);
    });

    it('clears all entries', () => {
      const cache = new BoundedLRUCache<string, number>(5);
      cache.set('x', 10);
      cache.set('y', 20);
      expect(cache.size).toBe(2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('x')).toBeUndefined();
    });
  });

  describe('Zero-Eval Math & Symbolic Parser (Stephen Wolfram grade)', () => {
    it('evaluates basic arithmetic correctly', () => {
      const res1 = evaluateExpression('25 * 40');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('1,000');

      const res2 = evaluateExpression('100 + 250 - 50');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('300');

      const res3 = evaluateExpression('(12 + 8) * 5');
      expect(res3).not.toBeNull();
      expect(res3?.result).toBe('100');
    });

    it('evaluates exponents and powers', () => {
      const res = evaluateExpression('2 ^ 8');
      expect(res).not.toBeNull();
      expect(res?.result).toBe('256');

      const res2 = evaluateExpression('3 ** 3');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('27');
    });

    it('evaluates mathematical functions and constants', () => {
      const res1 = evaluateExpression('sqrt(144)');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('12');

      const res2 = evaluateExpression('sqrt(144) + 10');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('22');

      const res3 = evaluateExpression('abs(-55)');
      expect(res3).not.toBeNull();
      expect(res3?.result).toBe('55');

      const res4 = evaluateExpression('round(4.8)');
      expect(res4).not.toBeNull();
      expect(res4?.result).toBe('5');
    });

    it('evaluates percentage calculations', () => {
      const res1 = evaluateExpression('15% of 200');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('30');

      const res2 = evaluateExpression('20% off 100');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('80');
    });

    it('evaluates unit conversions (length, mass, storage)', () => {
      const res1 = evaluateExpression('10 km to m');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('10,000 m');

      const res2 = evaluateExpression('1 gb to mb');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('1,024 mb');

      const res3 = evaluateExpression('1000 g to kg');
      expect(res3).not.toBeNull();
      expect(res3?.result).toBe('1 kg');
    });

    it('evaluates temperature conversions', () => {
      const res1 = evaluateExpression('100 c to f');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('212 °F');

      const res2 = evaluateExpression('32 f to c');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('0 °C');
    });

    it('evaluates currency conversions', () => {
      const res = evaluateExpression('100 usd to eur');
      expect(res).not.toBeNull();
      expect(res?.result).toContain('EUR');
    });

    it('evaluates base conversions (hex, dec, bin)', () => {
      const res1 = evaluateExpression('255 in hex');
      expect(res1).not.toBeNull();
      expect(res1?.result).toBe('0xFF');

      const res2 = evaluateExpression('0xff in dec');
      expect(res2).not.toBeNull();
      expect(res2?.result).toBe('255');

      const res3 = evaluateExpression('12 in bin');
      expect(res3).not.toBeNull();
      expect(res3?.result).toBe('0b1100');
    });

    it('safely rejects non-math and malicious queries', () => {
      expect(evaluateExpression('hello world')).toBeNull();
      expect(evaluateExpression('alert("xss")')).toBeNull();
      expect(evaluateExpression('javascript:void(0)')).toBeNull();
      expect(evaluateExpression('')).toBeNull();
    });
  });

  describe('Slash Command Directory & Navigation', () => {
    it('contains comprehensive commands for engines and AI models', () => {
      expect(SLASH_COMMANDS['/g']).toBeDefined();
      expect(SLASH_COMMANDS['/b']).toBeDefined();
      expect(SLASH_COMMANDS['/gh']).toBeDefined();
      expect(SLASH_COMMANDS['/yt']).toBeDefined();
      expect(SLASH_COMMANDS['/w']).toBeDefined();
      expect(SLASH_COMMANDS['/r']).toBeDefined();
      expect(SLASH_COMMANDS['/so']).toBeDefined();
      expect(SLASH_COMMANDS['/gpt']).toBeDefined();
      expect(SLASH_COMMANDS['/claude']).toBeDefined();
      expect(SLASH_COMMANDS['/perp']).toBeDefined();
      expect(SLASH_COMMANDS['/gem']).toBeDefined();
      expect(SLASH_COMMANDS['/tab']).toBeDefined();
      expect(SLASH_COMMANDS['/bm']).toBeDefined();
      expect(SLASH_COMMANDS['/note']).toBeDefined();
    });
  });

  describe('Local Notes & App Search', () => {
    it('finds matching notes and apps', () => {
      const sources = {
        notes: [
          { id: '1', title: 'Antigravity Workspace Ideas', body: 'Build the best extension' },
          { id: '2', title: 'Shopping List', body: 'Apples, milk, bread' },
        ],
        apps: [
          { name: 'GitHub', url: 'https://github.com' },
          { name: 'YouTube', url: 'https://youtube.com' },
        ],
      };

      const res = searchLocalNotesAndApps('anti', sources);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0]?.title).toBe('Antigravity Workspace Ideas');
      expect(res[0]?.type).toBe('note');

      const appRes = searchLocalNotesAndApps('git', sources);
      expect(appRes.some((r) => r.title === 'GitHub')).toBe(true);
    });
  });

  describe('queryOmniscientSearch master coordinator', () => {
    it('returns slash command suggestions when typing slash', async () => {
      const results = await queryOmniscientSearch({ query: '/' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.type).toBe('slash');
    });

    it('returns instant calculation on math queries', async () => {
      const results = await queryOmniscientSearch({ query: '45 * 10' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.type).toBe('calc');
      expect(results[0]?.value).toBe('450');
    });
  });
});
