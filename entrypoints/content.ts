export default defineContentScript({
  matches: ['*://google.com/*', '*://*.google.com/*', '*://google.co.in/*', '*://*.google.co.in/*', '*://bing.com/*', '*://*.bing.com/*'],
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
            window.parent.postMessage({ action: 'iframe_navigated', title: rawTitle }, '*');
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

      // Clean up any legacy detached elements before mounting
      document.querySelectorAll('.raeen-settings-btn, #raeen-shadow-root').forEach(el => el.remove());

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
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .raeen-floating-dock {
          position: fixed !important;
          bottom: 22px !important;
          left: 22px !important;
          z-index: 2147483647 !important;
          background: rgba(15, 23, 42, 0.88) !important;
          backdrop-filter: blur(18px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-radius: 9999px !important;
          padding: 4px 6px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 3px !important;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .raeen-floating-dock:hover {
          box-shadow: 0 14px 36px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.28) !important;
        }

        .raeen-dock-btn {
          position: relative !important;
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          color: #ffffff !important;
          text-decoration: none !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .raeen-dock-btn svg {
          width: 20px !important;
          height: 20px !important;
          color: #ffffff !important;
          fill: none;
          stroke: currentColor;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease !important;
        }

        .raeen-dock-btn.btn-home:hover {
          background: rgba(56, 189, 248, 0.2) !important;
          color: #38bdf8 !important;
          transform: translateY(-2px) scale(1.06) !important;
        }

        .raeen-dock-btn.btn-settings:hover {
          background: rgba(168, 85, 247, 0.2) !important;
          color: #c084fc !important;
          transform: translateY(-2px) scale(1.06) !important;
        }

        .raeen-dock-btn.btn-settings:hover svg {
          transform: rotate(60deg) !important;
        }

        .raeen-dock-divider {
          width: 1px !important;
          height: 18px !important;
          background: rgba(255, 255, 255, 0.16) !important;
          margin: 0 1px !important;
        }

        /* Micro tooltip */
        .raeen-tooltip {
          position: absolute !important;
          bottom: calc(100% + 9px) !important;
          left: 50% !important;
          transform: translateX(-50%) translateY(4px) scale(0.95) !important;
          background: rgba(11, 15, 25, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color: #f8fafc !important;
          padding: 4px 9px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          font-weight: 550 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          opacity: 0 !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45) !important;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .raeen-dock-btn:hover .raeen-tooltip {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(0) scale(1) !important;
        }

        @media (max-width: 768px) {
          .raeen-floating-dock {
            bottom: 14px !important;
            left: 14px !important;
            padding: 3px 5px !important;
          }
          .raeen-dock-btn {
            width: 34px !important;
            height: 34px !important;
          }
          .raeen-dock-btn svg {
            width: 17px !important;
            height: 17px !important;
          }
        }
      `);
      shadow.adoptedStyleSheets = [sheet];

      // Build Floating Dock container
      const dock = document.createElement('div');
      dock.className = 'raeen-floating-dock';

      // 1. Home / Dashboard Button
      const homeBtn = document.createElement('button');
      homeBtn.className = 'raeen-dock-btn btn-home';
      homeBtn.setAttribute('aria-label', 'Dashboard');
      homeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9.5z"></path>
          <polyline points="9 21 9 12 15 12 15 21"></polyline>
        </svg>
        <span class="raeen-tooltip">Dashboard</span>
      `;
      homeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.self !== window.top) {
          window.parent.postMessage({ action: 'close_dashboard_iframe' }, '*');
        } else {
          browser.runtime.sendMessage({ action: 'open_dashboard' });
        }
      });

      // 2. Divider
      const divider = document.createElement('div');
      divider.className = 'raeen-dock-divider';

      // 3. Settings Button
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'raeen-dock-btn btn-settings';
      settingsBtn.setAttribute('aria-label', 'Settings');
      settingsBtn.innerHTML = `
        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span class="raeen-tooltip">Settings</span>
      `;
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.self !== window.top) {
          window.parent.postMessage({ action: 'open_dashboard_settings' }, '*');
        } else {
          browser.runtime.sendMessage({ action: 'open_dashboard', openSettings: true });
        }
      });

      dock.appendChild(homeBtn);
      dock.appendChild(divider);
      dock.appendChild(settingsBtn);
      shadow.appendChild(dock);

      const mountDock = () => {
        if (!document.getElementById('raeen-shadow-root')) {
          document.body?.appendChild(host);
        }
      };

      if (document.body) {
        mountDock();
      } else {
        document.addEventListener('DOMContentLoaded', mountDock);
      }
    }
  },
});
