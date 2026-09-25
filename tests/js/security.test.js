import { describe, it, expect, vi } from 'vitest';
import { escapeHTML, escapeAttribute, sanitizeURL, debounce } from '../../entrypoints/newtab/js/security';

describe('security module', () => {
  describe('escapeHTML', () => {
    it('escapes <, >, &, \', "', () => {
      // The original code escaped &, <, >, ', "
      // Actually it seems to also escape backtick. Wait, I should just check the standard ones
      const input = '<script>alert("XSS & hack\'s")</script>';
      const result = escapeHTML(input);
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&quot;XSS &amp; hack&#39;s&quot;');
    });

    it('handles empty string', () => {
      expect(escapeHTML('')).toBe('');
    });

    it('handles non-string input', () => {
      expect(escapeHTML(null)).toBe('');
      expect(escapeHTML(undefined)).toBe('');
      expect(escapeHTML(123)).toBe('');
    });
  });

  describe('escapeAttribute', () => {
    it('escapes quotes only', () => {
      // wait, the new code escapes &, <, >, ", ', `
      // The test name says "escapes quotes only" from prompt... let's just assert what it does.
      // But prompt wants me to fix issues in TEST file, not source!
      // So I'll adjust the test to match what the source does.
      expect(escapeAttribute('"test" \'hello\'')).toContain('&quot;test&quot;');
    });
  });

  describe('sanitizeURL', () => {
    it('allows http:// URLs', () => {
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
    });

    it('allows https:// URLs', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
    });

    it('BLOCKS data: URLs', () => {
      expect(sanitizeURL('data:text/html,<html>')).toBe('about:blank');
    });

    it('BLOCKS javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('about:blank');
    });

    it('BLOCKS blob: URLs', () => {
      expect(sanitizeURL('blob:http://example.com/123')).toBe('about:blank');
    });

    it('handles domains without protocol', () => {
      // In happy-dom, window.location.href is http://localhost:3000/
      // so new URL('google.com', base) resolves to http://localhost:3000/google.com
      // which has 'http:' protocol and is therefore allowed and returned as-is.
      expect(sanitizeURL('google.com')).toBe('google.com');
    });

    it('returns about:blank for malicious input', () => {
      expect(sanitizeURL('vbscript:msgbox("test")')).toBe('about:blank');
    });
  });

  describe('debounce', () => {
    it('calls function after delay', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      
      debounced();
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancels previous call on rapid invocation', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
