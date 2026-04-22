// Auto-paste search query into AI chat input fields
(function () {
    'use strict';

    // Extract query from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (!query) return;

    // Clean the query param from the URL
    history.replaceState(null, '', window.location.origin + window.location.pathname);

    // Configurable selectors for different platforms
    const selectors = {
        chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]'],
        gemini: ['[contenteditable="true"]', '.input-area textarea'],
        copilot: ['textarea', 'input[type="text"]'],
        perplexity: ['textarea', 'input[placeholder*="Ask"]'],
        claude: ['div[contenteditable="true"]', 'textarea'],
        defaultSend: [
            'button[aria-label="Send"]',
            'button[aria-label="Submit"]',
            'button.send-button',
            'button[data-testid="send-button"]',
            'button[mat-icon-button]',
            '.input-area button'
        ]
    };

    // Utility: find element by selectors
    function findElement(selectors) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // Utility: set value safely
    function setValue(el, value) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            nativeSetter ? nativeSetter.call(el, value) : el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.isContentEditable) {
            el.focus();
            el.textContent = '';
            document.execCommand('insertText', false, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Try multiple times (SPA loading)
    let attempts = 0;
    const maxAttempts = 30;
    const interval = 500;

    const tryPaste = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(tryPaste);
            return;
        }

        console.log('AI Inject Engine: Attempt', attempts);

        let inputEl = null;
        const host = window.location.hostname;

        if (host.includes('chatgpt.com')) {
            inputEl = findElement(selectors.chatgpt);
        } else if (host.includes('gemini.google.com')) {
            inputEl = findElement(selectors.gemini);
        } else if (host.includes('copilot.microsoft.com')) {
            inputEl = findElement(selectors.copilot);
        } else if (host.includes('perplexity.ai')) {
            inputEl = findElement(selectors.perplexity);
        } else if (host.includes('claude.ai')) {
            inputEl = findElement(selectors.claude);
        }

        if (!inputEl) return;

        clearInterval(tryPaste);

        // Insert query
        setValue(inputEl, query);
        inputEl.focus();

        // Auto-submit
        setTimeout(() => {
            const sendBtn = findElement(selectors.defaultSend);
            if (sendBtn && !sendBtn.disabled) {
                sendBtn.click();
            } else {
                inputEl.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                }));
            }
        }, 800);

    }, interval);
})();
