/**
 * Security Utility Module
 * Implements strict sanitization, HTML escaping, and URL validation
 * to protect the extension from Stored XSS and javascript: link injections.
 */

/**
 * Escapes characters to prevent HTML/XSS injection.
 * @param {string} str Raw string
 * @returns {string} Escaped safe HTML
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

/**
 * Escapes attribute values to prevent attribute breakout.
 * @param {string} str Raw string for attribute
 * @returns {string} Escaped safe attribute value
 */
export function escapeAttribute(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/["']/g, tag => ({
        '"': '&quot;',
        "'": '&#39;'
    }[tag] || tag));
}

/**
 * Validates and sanitizes URLs to block javascript: protocol injection.
 * @param {string} urlStr URL input
 * @returns {string} Clean URL, fallback to about:blank if malicious
 */
export function sanitizeURL(urlStr) {
    if (typeof urlStr !== 'string') return 'about:blank';
    const trimmed = urlStr.trim();
    
    // Allow relative paths (e.g. for extension assets)
    if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
        return trimmed;
    }
    
    // Parse URL and guarantee safe protocol (http, https, data)
    try {
        const parsed = new URL(trimmed, window.location.href);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'data:') {
            return trimmed;
        }
    } catch (e) {
        // Fallback for simple domains without protocol (e.g. "google.com")
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
            return 'https://' + trimmed;
        }
    }
    
    return 'about:blank';
}

/**
 * Generic debounce utility to limit rate of function execution.
 * @param {Function} func Callback function
 * @param {number} delay Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay = 200) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
