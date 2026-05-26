export default defineContentScript({
  matches: ['*://google.com/*', '*://*.google.com/*', '*://google.co.in/*', '*://*.google.co.in/*', '*://bing.com/*', '*://*.bing.com/*'],
  allFrames: true,
  main() {
    // 1. Safe Iframe Link Block Prevention
    // If the search engine is loaded inside our dashboard iframe, force all search links to open in a new tab
    // to prevent standard SAMEORIGIN/X-Frame blocks on target websites.
    if (window.self !== window.top) {
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

        // Capture clicks on document level early to bypass Google/Bing JS handlers
        document.addEventListener('click', (e) => {
          let target = e.target as HTMLElement | null;
          while (target && target.tagName !== 'A') {
            target = target.parentNode as HTMLElement | null;
          }
          if (target) {
            const anchor = target as HTMLAnchorElement;
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
      return;
    }

    // 2. Settings button injection for topmost frames
    const urlParams = new URLSearchParams(window.location.search);
    const hasParam = urlParams.has('raeen_dashboard') || window.location.href.includes('raeen_dashboard=true');

    if (hasParam) {
      // Clean URL immediately to keep address bar pristine
      const cleanUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('raeen_dashboard');
        url.searchParams.delete('abdus_dashboard'); // Legacy param cleanup
        const newURL = url.pathname + url.search + url.hash;
        window.history.replaceState({}, document.title, newURL);
      };

      cleanUrl();
      window.addEventListener('load', cleanUrl);
      window.addEventListener('load', () => setTimeout(cleanUrl, 1500));

      // Create host container for Shadow DOM isolation
      const host = document.createElement('div');
      host.id = 'raeen-shadow-root';
      host.style.position = 'fixed';
      host.style.bottom = '0';
      host.style.left = '0';
      host.style.width = '0';
      host.style.height = '0';
      host.style.zIndex = '2147483647';
      
      const shadow = host.attachShadow({ mode: 'open' });

      // Inject isolating Constructable Stylesheets
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`
        .raeen-settings-btn {
          position: fixed !important;
          bottom: 30px !important;
          left: 30px !important;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.6) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 50% !important;
          width: 50px !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;
        }
        .raeen-settings-btn:hover {
          transform: rotate(45deg) scale(1.1) !important;
          background: rgba(0, 0, 0, 0.8) !important;
          border-color: #7b61ff !important;
          color: #7b61ff !important;
          box-shadow: 0 8px 30px rgba(123, 97, 255, 0.4) !important;
        }
        .raeen-settings-btn svg {
          width: 24px !important;
          height: 24px !important;
        }
        @media (max-width: 768px) {
          .raeen-settings-btn {
            bottom: 16px !important;
            left: 16px !important;
            width: 40px !important;
            height: 40px !important;
          }
          .raeen-settings-btn svg {
            width: 20px !important;
            height: 20px !important;
          }
        }
      `);
      shadow.adoptedStyleSheets = [sheet];

      // Create Settings trigger button inside Shadow Root
      const btn = document.createElement('a');
      btn.className = 'raeen-settings-btn';
      btn.href = '#';
      btn.title = 'Back to NewTab Dashboard';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        browser.runtime.sendMessage({ action: 'open_dashboard' });
      });

      shadow.appendChild(btn);
      document.body.appendChild(host);
    }
  },
});
