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

      // Proactively check if this is our framed dashboard search results page
      const urlParams = new URLSearchParams(window.location.search);
      const hasParam = urlParams.has('raeen_dashboard') || window.location.href.includes('raeen_dashboard=true');
      if (!hasParam) {
        return;
      }
    }

    // 2. Settings button injection for topmost or framed dashboard pages
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
        .raeen-home-btn {
          position: fixed !important;
          bottom: 85px !important;
          left: 25px !important;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.6) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 50% !important;
          width: 48px !important;
          height: 48px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;
        }
        .raeen-home-btn:hover {
          transform: translateY(-3px) scale(1.1) !important;
          background: rgba(0, 0, 0, 0.8) !important;
          border-color: #7b61ff !important;
          color: #7b61ff !important;
          box-shadow: 0 8px 30px rgba(123, 97, 255, 0.4) !important;
        }
        .raeen-home-btn svg {
          width: 22px !important;
          height: 22px !important;
        }
        @media (max-width: 768px) {
          .raeen-home-btn {
            bottom: 60px !important;
            left: 16px !important;
            width: 40px !important;
            height: 40px !important;
          }
          .raeen-home-btn svg {
            width: 18px !important;
            height: 18px !important;
          }
        }
      `);
      shadow.adoptedStyleSheets = [sheet];

      // Create Settings trigger button inside Shadow Root
      const btn = document.createElement('a');
      btn.className = 'raeen-home-btn';
      btn.href = '#';
      btn.title = 'Back to NewTab Dashboard';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.self !== window.top) {
          browser.runtime.sendMessage({ action: 'close_dashboard_iframe' });
        } else {
          browser.runtime.sendMessage({ action: 'open_dashboard' });
        }
      });

      shadow.appendChild(btn);
      document.body.appendChild(host);
    }
  },
});
