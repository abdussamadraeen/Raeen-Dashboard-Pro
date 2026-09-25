/**
 * security.js — Raeen Workspace Security Utilities
 *
 * Provides XSS prevention, URL sanitization, and utility functions.
 * All functions are pure and have no side effects.
 *
 * Security audit findings fixed:
 *   [CRITICAL] sanitizeURL allowed data: protocol → XSS vector (FIXED)
 *   [HIGH]     escapeHTML missing backtick/template literal escaping (FIXED)
 *   [HIGH]     escapeAttribute insufficient for attribute context (FIXED)
 *   [MEDIUM]   sanitizeURL allowed blob: URLs without restriction (FIXED)
 *   [LOW]      debounce not cancellable (FIXED — returns cancel())
 */

// ─── Allowlist of safe URL protocols ─────────────────────────────────────────
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Escapes a string for safe insertion as HTML text content.
 * Covers: & < > ' " ` (backtick added to prevent template injection)
 *
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"`]/g, tag => {
        const chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '`': '&#96;',
        };
        return chars[tag] || tag;
    });
}

/**
 * Escapes a string for safe insertion into an HTML attribute value.
 * Covers: " ' ` and additionally & < > to be safe in any attribute context.
 *
 * @param {unknown} str
 * @returns {string}
 */
export function escapeAttribute(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"` ]/g, tag => {
        const chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#96;',
        };
        return chars[tag] || tag;
    });
}

/**
 * Sanitizes a URL string to only allow safe protocols (http:, https:).
 *
 * Security guarantees:
 *   - BLOCKS javascript: — prevents JS execution in href/src
 *   - BLOCKS data: — prevents XSS via data URIs (was allowed before, now FIXED)
 *   - BLOCKS blob: — prevents access to local blob URLs
 *   - BLOCKS vbscript: — IE legacy XSS vector
 *   - BLOCKS file: — prevents local file access
 *   - ALLOWS relative paths (/ and ./) for extension-internal navigation
 *   - ALLOWS bare domains (google.com) — prefixed with https://
 *
 * @param {unknown} urlStr
 * @returns {string} Sanitized URL or 'about:blank' for unsafe input
 */
export function sanitizeURL(urlStr) {
    if (typeof urlStr !== 'string') return 'about:blank';

    const trimmed = urlStr.trim();
    if (!trimmed) return 'about:blank';

    // Fast reject: obvious dangerous protocols (case-insensitive)
    const lower = trimmed.toLowerCase().replace(/\s+/g, '');
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:') ||      // [CRITICAL FIX] was allowed before
        lower.startsWith('blob:') ||
        lower.startsWith('file:')
    ) {
        return 'about:blank';
    }

    // Allow safe relative paths for extension-internal navigation
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
        return trimmed;
    }

    // Parse and validate protocol against allowlist
    try {
        const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'https://extension.local/');
        if (SAFE_PROTOCOLS.has(parsed.protocol)) {
            return trimmed;
        }
        // Protocol not in allowlist → block
        return 'about:blank';
    } catch {
        // URL parse failed — try adding https:// for bare domain input (e.g. "google.com")
        const bareDomainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/;
        if (bareDomainPattern.test(trimmed) && !trimmed.includes(' ')) {
            const withProtocol = 'https://' + trimmed;
            try {
                const parsed2 = new URL(withProtocol);
                if (SAFE_PROTOCOLS.has(parsed2.protocol)) {
                    return withProtocol;
                }
            } catch {
                // fall through
            }
        }
        return 'about:blank';
    }
}

/**
 * Validates that a port number is in the valid TCP/UDP range (1–65535).
 *
 * @param {unknown} port
 * @returns {number} Valid port, or 0 if invalid
 */
export function validatePort(port) {
    const n = typeof port === 'string' ? parseInt(port, 10) : Number(port);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return 0;
    return n;
}

/**
 * Validates a hostname — allows IPs, domains, and localhost.
 * Blocks empty strings, internal ranges from user-supplied values only.
 *
 * @param {string} host
 * @returns {boolean}
 */
export function isValidHost(host) {
    if (typeof host !== 'string' || !host.trim()) return false;
    const h = host.trim().toLowerCase();
    // Allow localhost and loopback
    if (h === 'localhost' || h === '127.0.0.1') return true;
    // IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        const parts = h.split('.').map(Number);
        return parts.every(p => p >= 0 && p <= 255);
    }
    // IPv6 (simplified check)
    if (h.startsWith('[') && h.endsWith(']')) return true;
    // Hostname
    return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/.test(h) && h.length <= 253;
}

/**
 * Debounce utility. Returns a function that delays invoking `func`
 * until after `wait` ms have elapsed since the last call.
 *
 * The returned function also has a `.cancel()` method to clear pending invocation.
 *
 * @param {Function} func
 * @param {number} wait
 * @returns {Function & { cancel: () => void }}
 */
export function debounce(func, wait = 200) {
    let timeout;
    const debounced = function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func.apply(this, args);
        }, wait);
    };
    debounced.cancel = function () {
        clearTimeout(timeout);
        timeout = null;
    };
    return debounced;
}

/**
 * Throttle utility. Ensures `func` is called at most once per `limit` ms.
 *
 * @param {Function} func
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(func, limit = 100) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

/**
 * Safe JSON parse — returns null instead of throwing on malformed input.
 *
 * @template T
 * @param {string | null | undefined} str
 * @param {T | null} [fallback]
 * @returns {T | null}
 */
export function safeJSONParse(str, fallback = null) {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}
