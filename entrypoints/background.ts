export default defineBackground(() => {
  // Dynamically register rules on startup to guarantee header stripping
  const registerDynamicRules = async () => {
    try {
      const rules = [
        {
          id: 1001,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'X-Frame-Options', operation: 'remove' },
              { header: 'Frame-Options', operation: 'remove' },
              { header: 'Content-Security-Policy', operation: 'remove' },
              { header: 'X-Content-Security-Policy', operation: 'remove' },
              { header: 'X-WebKit-CSP', operation: 'remove' }
            ]
          },
          condition: {
            requestDomains: [
              'google.com', 'google.co.in', 'www.google.com', 'www.google.co.in',
              'bing.com', 'www.bing.com', 'cn.bing.com', 'live.com', 'www.live.com'
            ],
            resourceTypes: ['sub_frame']
          }
        }
      ];

      const existingRules = await browser.declarativeNetRequest.getDynamicRules();
      const existingIds = existingRules.map(r => r.id);

      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
        addRules: rules as any
      });
      console.log('✓ Dynamic DNR rules registered successfully.');
    } catch (e) {
      console.error('Failed to register dynamic DNR rules:', e);
    }
  };

  // Function to clear Service Workers for Google/Bing to prevent DNR bypass
  const clearServiceWorkers = async () => {
    try {
      if (browser.browsingData && browser.browsingData.remove) {
        await browser.browsingData.remove(
          {
            origins: [
              'https://google.com',
              'https://www.google.com',
              'https://google.co.in',
              'https://www.google.co.in',
              'https://bing.com',
              'https://www.bing.com'
            ]
          },
          {
            serviceWorkers: true
          }
        );
        console.log('✓ Cleared Google/Bing service workers to prevent DNR bypass.');
      }
    } catch (e) {
      console.error('Failed to clear service workers:', e);
    }
  };

  // Call on initialization
  registerDynamicRules();
  clearServiceWorkers();

  // ─── MILITARY DEFENSE & PROXY / WEBRTC ENGINE ───
  let isVpnActive = false;
  let activeVpnNode: any = null;

  // Restore proxy state check on startup
  try {
    if ((globalThis as any).chrome?.proxy?.settings) {
      (globalThis as any).chrome.proxy.settings.get({ incognito: false }, (config: any) => {
        if (config && config.levelOfControl === 'controlled_by_this_extension') {
          isVpnActive = true;
        }
      });
    }
  } catch (e) {}

  // Listen for actions from dashboard and content scripts
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'open_dashboard' && sender.tab?.id) {
      clearServiceWorkers();
      const url = browser.runtime.getURL('/newtab.html') + '?no_redirect=true&settings=true';
      browser.tabs.update(sender.tab.id, { url });
    } else if (request.action === 'open_tab' && request.url) {
      browser.tabs.create({ url: request.url });
    } else if (request.action === 'vpn_connect') {
      try {
        const { scheme = 'https', host, port, killSwitch = true, nodeName = 'Tactical Node' } = request.payload || {};
        if (!host || !port) {
          sendResponse({ success: false, error: 'Target host or port missing' });
          return true;
        }

        const chromeProxy = (globalThis as any).chrome?.proxy;
        if (!chromeProxy || !chromeProxy.settings) {
          sendResponse({ success: false, error: 'Chrome Proxy API not available or permission denied.' });
          return true;
        }

        if (killSwitch) {
          // Fail-closed PAC script: drops traffic if proxy is unreachable instead of leaking unencrypted data to ISP
          const pacScript = `
            function FindProxyForURL(url, host) {
              if (isPlainHostName(host) || shExpMatch(host, "*.local")) return "DIRECT";
              return "${scheme.toUpperCase()} ${host}:${port}; PROXY 127.0.0.1:9";
            }
          `;
          chromeProxy.settings.set({
            value: {
              mode: 'pac_script',
              pacScript: { data: pacScript }
            },
            scope: 'regular'
          }, () => {
            isVpnActive = true;
            activeVpnNode = { scheme, host, port, nodeName, killSwitch };
            sendResponse({ success: true, activeVpnNode });
          });
        } else {
          // Direct fixed server configuration
          chromeProxy.settings.set({
            value: {
              mode: 'fixed_servers',
              rules: {
                singleProxy: { scheme: scheme.toLowerCase(), host, port: Number(port) },
                bypassList: ['<local>']
              }
            },
            scope: 'regular'
          }, () => {
            isVpnActive = true;
            activeVpnNode = { scheme, host, port, nodeName, killSwitch };
            sendResponse({ success: true, activeVpnNode });
          });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
      return true;
    } else if (request.action === 'vpn_disconnect') {
      try {
        const chromeProxy = (globalThis as any).chrome?.proxy;
        if (chromeProxy?.settings) {
          chromeProxy.settings.clear({ scope: 'regular' }, () => {
            isVpnActive = false;
            activeVpnNode = null;
            sendResponse({ success: true });
          });
        } else {
          isVpnActive = false;
          activeVpnNode = null;
          sendResponse({ success: true });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
      return true;
    } else if (request.action === 'vpn_get_status') {
      try {
        const chromeProxy = (globalThis as any).chrome?.proxy;
        if (chromeProxy?.settings) {
          chromeProxy.settings.get({ incognito: false }, (config: any) => {
            const isControlled = config && config.levelOfControl === 'controlled_by_this_extension';
            sendResponse({
              success: true,
              isActive: isControlled || isVpnActive,
              activeVpnNode,
              levelOfControl: config?.levelOfControl || 'not_controllable'
            });
          });
        } else {
          sendResponse({ success: true, isActive: isVpnActive, activeVpnNode });
        }
      } catch (err: any) {
        sendResponse({ success: false, isActive: isVpnActive, activeVpnNode });
      }
      return true;
    } else if (request.action === 'webrtc_shield_set') {
      try {
        const enabled = request.enabled !== false;
        const privacy = (globalThis as any).chrome?.privacy;
        if (privacy?.network?.webRTCIPHandlingPolicy) {
          privacy.network.webRTCIPHandlingPolicy.set({
            value: enabled ? 'disable_non_proxied_udp' : 'default'
          }, () => {
            sendResponse({ success: true, enabled });
          });
        } else {
          sendResponse({ success: false, error: 'WebRTC privacy API unavailable' });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
      return true;
    } else if (request.action === 'emergency_nuclear_purge') {
      try {
        if (browser.browsingData && browser.browsingData.remove) {
          browser.browsingData.remove({
            since: 0
          }, {
            appcache: true,
            cache: true,
            cacheStorage: true,
            cookies: true,
            fileSystems: true,
            formData: true,
            history: true,
            serviceWorkers: true,
            webSQL: true
          }).then(() => {
            sendResponse({ success: true, purgedAt: Date.now() });
          }).catch((err: any) => {
            sendResponse({ success: false, error: err?.message || String(err) });
          });
        } else {
          sendResponse({ success: false, error: 'browsingData API unavailable' });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
      return true;
    }
  });

  // Mobile / Edge Beta fallback redirect
  const newTabUrls = [
    'chrome://newtab/',
    'chrome-search://local-ntp/local-ntp.html',
    'chrome-native://newtab/',
    'kiwi://newtab/',
    'edge://newtab/',
    'about:blank',
    'about:newtab',
    'about:home'
  ];

  const redirectToDashboard = async (tabId: number, url?: string) => {
    try {
      if (url && newTabUrls.some(target => url.startsWith(target))) {
        const dashboardUrl = browser.runtime.getURL('/newtab.html');
        // Prevent infinite loops if we are already on the dashboard page
        if (!url.includes(dashboardUrl)) {
          clearServiceWorkers();
          await browser.tabs.update(tabId, { url: dashboardUrl });
        }
      }
    } catch (e) {
      console.error('Failed to redirect native new tab page:', e);
    }
  };

  // Only register mobile fallback redirects on Android to keep Desktop address bars clean
  browser.runtime.getPlatformInfo().then((info) => {
    if (info.os === 'android') {
      // Intercept tab creation
      browser.tabs.onCreated.addListener((tab) => {
        if (tab.id) {
          redirectToDashboard(tab.id, tab.url || tab.pendingUrl);
        }
      });

      // Intercept tab navigation updates
      browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url) {
          redirectToDashboard(tabId, changeInfo.url);
        }
      });
      console.log('✓ Registered mobile newtab redirect listeners for Android.');
    } else {
      console.log('✓ Desktop platform detected. Using native manifest overrides to keep address bar clean.');
    }
  });
});
