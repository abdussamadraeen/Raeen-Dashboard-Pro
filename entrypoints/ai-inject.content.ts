export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://*.gemini.google.com/*',
    '*://copilot.microsoft.com/*',
    '*://*.perplexity.ai/*',
    '*://*.claude.ai/*',
    '*://*.blackbox.ai/*',
    '*://huggingface.co/*',
    '*://*.groq.com/*',
    '*://*.mistral.ai/*',
    '*://*.cohere.com/*',
    '*://*.cohere.ai/*',
    '*://*.together.ai/*',
    '*://replicate.com/*',
  ],
  main() {
    // Extract query from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (!query) return;

    // Clean the query param from the URL immediately for aesthetic reasons
    history.replaceState(null, '', window.location.origin + window.location.pathname);

    // Configurable selectors for different platforms
    const selectors = {
      chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]'],
      gemini: ['[contenteditable="true"]', '.input-area textarea'],
      copilot: ['textarea', 'input[type="text"]'],
      perplexity: ['textarea', 'input[placeholder*="Ask"]'],
      claude: ['div[contenteditable="true"]', 'textarea'],
      blackbox: ['#input-div', 'textarea[placeholder*="Ask"]'],
      huggingface: ['textarea[placeholder*="chat"]', 'input[placeholder*="Type"]'],
      groq: ['textarea[data-testid="composer-input"]', 'textarea'],
      mistral: ['textarea[placeholder*="message"]', 'input[aria-label*="message"]'],
      cohere: ['textarea[placeholder*="Ask"]', 'input[placeholder*="message"]'],
      together: ['textarea[placeholder*="message"]', 'input[data-qa*="input"]'],
      replicate: ['textarea[placeholder*="prompt"]', 'input[placeholder*="prompt"]'],
      defaultSend: [
        'button[aria-label="Send"]',
        'button[aria-label="Submit"]',
        'button.send-button',
        'button[data-testid="send-button"]',
        'button[mat-icon-button]',
        'button[type="submit"]',
        '.input-area button',
        'button[class*="send"]',
        'button[class*="submit"]',
      ],
    };

    // Utility: find element by selectors (uses native CSS engine joining for fast matching)
    function findElement(selList: string[]): HTMLElement | null {
      try {
        return document.querySelector(selList.join(',')) as HTMLElement | null;
      } catch (e) {
        for (const sel of selList) {
          try {
            const el = document.querySelector(sel);
            if (el) return el as HTMLElement;
          } catch (err) {}
        }
      }
      return null;
    }

    // Utility: set value safely across framework native bindings (e.g. React state hook triggers)
    function setValue(el: HTMLElement, value: string) {
      try {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(inputEl, value);
          } else {
            inputEl.value = value;
          }
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.isContentEditable) {
          el.focus();
          el.textContent = '';
          document.execCommand('insertText', false, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (e) {
        console.error('Error setting input value:', e);
      }
    }

    // Resolve host & active selectors once upfront rather than inside the polling interval loop
    const host = window.location.hostname;
    let activeSelectors: string[] = [];

    if (host.includes('chatgpt.com')) activeSelectors = selectors.chatgpt;
    else if (host.includes('gemini.google.com')) activeSelectors = selectors.gemini;
    else if (host.includes('copilot.microsoft.com')) activeSelectors = selectors.copilot;
    else if (host.includes('perplexity.ai')) activeSelectors = selectors.perplexity;
    else if (host.includes('claude.ai')) activeSelectors = selectors.claude;
    else if (host.includes('blackbox.ai')) activeSelectors = selectors.blackbox;
    else if (host.includes('huggingface.co')) activeSelectors = selectors.huggingface;
    else if (host.includes('groq.com')) activeSelectors = selectors.groq;
    else if (host.includes('mistral.ai')) activeSelectors = selectors.mistral;
    else if (host.includes('cohere.ai') || host.includes('cohere.com')) activeSelectors = selectors.cohere;
    else if (host.includes('together.ai')) activeSelectors = selectors.together;
    else if (host.includes('replicate.com')) activeSelectors = selectors.replicate;
    else {
      // Auto-detection fallback: flat array of all known selectors
      activeSelectors = Object.keys(selectors)
        .filter(k => k !== 'defaultSend')
        .flatMap(k => selectors[k as keyof typeof selectors]);
    }

    // Try multiple times to paste (handling SPA loading and network transition delays)
    let attempts = 0;
    const maxAttempts = 30;
    const interval = 500;

    const tryPaste = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(tryPaste);
        console.log('AI Inject: Max attempts reached without finding input element');
        return;
      }

      const inputEl = findElement(activeSelectors);
      if (!inputEl) return;

      clearInterval(tryPaste);

      // Insert query
      try {
        setValue(inputEl, query);
        inputEl.focus();
        console.log('✓ AI Inject: Query inserted successfully');

        // Auto-submit after typing simulation
        setTimeout(() => {
          try {
            const sendBtn = findElement(selectors.defaultSend) as HTMLButtonElement | null;
            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
              console.log('✓ AI Inject: Message sent automatically via click');
            } else {
              if (inputEl) {
                inputEl.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13,
                  bubbles: true,
                }));
                console.log('✓ AI Inject: Enter key dispatched');
              }
            }
          } catch (submitError) {
            console.error('AI Inject: Error during submit:', submitError);
          }
        }, 800);
      } catch (insertError) {
        console.error('AI Inject: Error inserting query:', insertError);
      }
    }, interval);
  },
});
