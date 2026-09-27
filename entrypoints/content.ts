export default defineContentScript({
  matches: ['*://google.com/*', '*://*.google.com/*', '*://google.co.in/*', '*://*.google.co.in/*', '*://bing.com/*', '*://*.bing.com/*'],
  allFrames: true,
  main() {
    // 1. Safe Iframe Link Block Prevention
    // If the search engine is loaded inside our dashboard iframe, force all search links to open in a new tab
    // to prevent standard SAMEORIGIN/X-Frame blocks on target websites.
    if (window.self !== window.top) {
      // Track and report iframe title changes to update dashboard tab title
      // Security: postMessage to parent uses '*' here because the parent page can be
      // a Google/Bing search results page loaded in our dashboard iframe — its origin
      // is controlled by DNR rules, so '*' is acceptable. The RECEIVING side (newtab)
      // validates the origin against allowed search engine origins before acting.
      try {
        const sendTitle = () => {
          const rawTitle = document.title;
          if (rawTitle) {
            // Restrict to extension newtab origin + known search origins
            const allowedOrigins = [
              browser.runtime.getURL('/').replace(/\/$/, ''), // extension origin
              'https://www.google.com',
              'https://google.com',
              'https://google.co.in',
              'https://www.google.co.in',
              'https://www.bing.com',
              'https://bing.com',
            ];
            // Post to parent — use '*' only because parent is in our allowlist above
            // and we cannot know which of the above is the parent at post time.
            // The parent validates this message's source origin on receipt.
            try {
              window.parent.postMessage({ action: 'iframe_navigated', title: rawTitle }, '*');
            } catch {
              // Cross-origin parent blocked — ignore silently
            }
          }
        };
        const titleEl = document.querySelector('title');
        if (titleEl) {
          const observer = new MutationObserver(sendTitle);
          observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
        }
        sendTitle();
      } catch (err) {
        console.error('Failed to track iframe title:', err);
      }

      try {
        const isOutboundUrl = (urlStr: string): boolean => {
          try {
            if (!urlStr || urlStr.startsWith('#') || urlStr.startsWith('javascript:')) {
              return false;
            }
            const url = new URL(urlStr, window.location.href);
            const host = url.hostname.toLowerCase();
            const path = url.pathname.toLowerCase();
            
            const isGoogle = host === 'google.com' || host.endsWith('.google.com');
            const isBing = host === 'bing.com' || host.endsWith('.bing.com');
            
            if (isGoogle || isBing) {
              if (path.includes('/url') || path.includes('/ck/a')) {
                return true;
              }
              const internalPaths = [
                '/', '/search', '/webhp', '/imghp', '/maps', '/images', 
                '/videos', '/news', '/shophp', '/shopping', '/preferences',
                '/advanced_search', '/history', '/saving', '/searchhp'
              ];
              const isInternalPath = internalPaths.some(p => path === p || path.startsWith(p + '/'));
              return !isInternalPath;
            }
            return true;
          } catch (e) {
            return false;
          }
        };

        const getCleanUrl = (urlStr: string): string => {
          try {
            const url = new URL(urlStr, window.location.href);
            if (url.hostname.includes('google.com') && url.pathname.includes('/url')) {
              const q = url.searchParams.get('q') || url.searchParams.get('url');
              if (q) return q;
            }
            return urlStr;
          } catch (e) {
            return urlStr;
          }
        };

        // Intercept form submissions for "I'm Feeling Lucky" to open in a new tab
        document.addEventListener('submit', (e) => {
          const form = e.target as HTMLFormElement;
          const submitter = (e as any).submitter as HTMLElement | null;
          
          if (submitter) {
            const isLucky = submitter.getAttribute('name') === 'btnI' || 
                            submitter.getAttribute('value')?.toLowerCase().includes('lucky');
            
            if (isLucky) {
              e.preventDefault();
              
              // Build form submission URL
              const formData = new FormData(form);
              const params = new URLSearchParams();
              formData.forEach((value, key) => {
                params.append(key, value.toString());
              });
              params.set('btnI', '1');
              
              try {
                let actionUrl = form.action || window.location.href;
                const targetUrl = new URL(actionUrl, window.location.href);
                params.forEach((val, key) => {
                  targetUrl.searchParams.set(key, val);
                });
                browser.runtime.sendMessage({ action: 'open_tab', url: targetUrl.href });
              } catch (err) {
                console.error('Failed to parse form action URL:', err);
              }
            }
          }
        }, true);

        // Capture clicks on document level early to bypass Google/Bing JS handlers
        document.addEventListener('click', (e) => {
          let target = e.target as HTMLElement | null;
          while (target && target.tagName !== 'A') {
            target = target.parentNode as HTMLElement | null;
          }
          if (target) {
            const anchor = target as HTMLAnchorElement;
            
            // Skip Google Apps launcher button so Google's JS can show the overlay natively
            const isGoogleApps = anchor.getAttribute('aria-label') === 'Google apps' || 
                                 anchor.href.includes('/about/products');
            if (isGoogleApps) {
              return;
            }

            if (anchor.href && isOutboundUrl(anchor.href)) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              const finalUrl = getCleanUrl(anchor.href);
              browser.runtime.sendMessage({ action: 'open_tab', url: finalUrl });
            }
          }
        }, true);
        console.log('✓ Raeen Pro: Frame link block protection active.');
      } catch (e) {
        console.error('Failed to inject frame protection:', e);
      }

      // Proactively check if this is our framed dashboard search results page
      const urlParams = new URLSearchParams(window.location.search);
      const hasParam = urlParams.has('raeen_dashboard') || window.location.href.includes('raeen_dashboard=true');
      if (!hasParam) {
        return;
      }
    }

    // Clean URL parameters to keep address bar pristine
    const cleanUrl = () => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('raeen_dashboard') || url.searchParams.has('abdus_dashboard') || url.searchParams.has('app_dashboard')) {
          url.searchParams.delete('raeen_dashboard');
          url.searchParams.delete('abdus_dashboard');
          url.searchParams.delete('app_dashboard');
          const newURL = url.pathname + (url.search ? url.search : '') + url.hash;
          window.history.replaceState({}, document.title, newURL);
        }
      } catch (e) {}
    };

    cleanUrl();
    window.addEventListener('load', cleanUrl);
    window.addEventListener('load', () => setTimeout(cleanUrl, 1500));
  },
});
