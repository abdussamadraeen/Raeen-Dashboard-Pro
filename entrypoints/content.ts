export default defineContentScript({
  matches: [
    '*://google.com/*',
    '*://*.google.com/*',
    '*://google.co.in/*',
    '*://*.google.co.in/*',
    '*://bing.com/*',
    '*://*.bing.com/*'
  ],
  allFrames: true,
  main() {
    // 1. Safe Iframe Link Block Prevention
    // If the search engine is loaded inside our dashboard iframe, force all search links to open in a new tab
    // to prevent standard SAMEORIGIN/X-Frame blocks on target websites.
    if (window.self !== window.top) {
      // Track and report iframe title changes to update dashboard tab title
      try {
        const sendTitle = () => {
          const rawTitle = document.title;
          if (rawTitle) {
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
          } catch {
            return false;
          }
        };

        const getCleanUrl = (urlStr: string): string => {
          try {
            const url = new URL(urlStr, window.location.href);
            if (url.hostname.includes('google.com') && url.pathname.includes('/url')) {
              const q = url.searchParams.get('q') || url.searchParams.get('url');
              // Only return extracted parameter if it is an actual absolute web URL.
              // Prevents returning raw protobuf tokens (e.g. CAESaAH...) which trigger ERR_FILE_NOT_FOUND in Edge.
              if (q && (q.startsWith('http://') || q.startsWith('https://'))) {
                return q;
              }
            }
            return urlStr;
          } catch {
            return urlStr;
          }
        };

        const safeOpenTab = (rawUrl: string) => {
          if (!rawUrl) return;
          let safeUrl = rawUrl.trim();
          if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
            safeUrl = `https://${safeUrl}`;
          }
          try {
            browser.runtime.sendMessage({ action: 'open_tab', url: safeUrl });
          } catch (e) {
            console.warn('[Content] open_tab send error:', e);
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
                safeOpenTab(targetUrl.href);
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
              safeOpenTab(finalUrl);
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
      } catch {}
    };

    cleanUrl();
    window.addEventListener('load', cleanUrl);
    window.addEventListener('load', () => setTimeout(cleanUrl, 1500));
  },
});
