export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => {
        const chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return chars[tag] || tag;
    });
}

export function escapeAttribute(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/["']/g, tag => {
        const chars = {
            '"': '&quot;',
            "'": '&#39;'
        };
        return chars[tag] || tag;
    });
}

export function sanitizeURL(urlStr) {
    if (typeof urlStr !== 'string') return 'about:blank';
    
    const trimmed = urlStr.trim();
    // Allow relative paths
    if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
        return trimmed;
    }
    
    try {
        const parsed = new URL(trimmed, window.location.href);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'data:') {
            return trimmed;
        }
    } catch (err) {
        // Fallback for domains without protocol (e.g. "google.com")
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
            return 'https://' + trimmed;
        }
    }
    return 'about:blank';
}

export function debounce(func, wait = 200) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}
