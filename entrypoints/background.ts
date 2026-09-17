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

  // ─── MILITARY DEFENSE & PERSISTENT MV3 PROXY / WEBRTC ENGINE ───
  let isVpnActive = false;
  let activeVpnNode: any = null;
  let webrtcSealed = true;
  let killSwitchEnabled = false;

  const getStoredVpnState = async () => {
    try {
      const stored = await browser.storage.local.get([
        'raeen_vpn_active',
        'raeen_vpn_node_config',
        'raeen_vpn_webrtc',
        'raeen_vpn_killswitch'
      ]);
      return stored || {};
    } catch (e) {
      return {};
    }
  };

  const persistVpnState = async (data: Record<string, any>) => {
    try {
      await browser.storage.local.set(data);
    } catch (e) {}
  };

  // Restore proxy and privacy state on startup / worker wake-up
  const restoreVpnState = async () => {
    try {
      const stored = await getStoredVpnState();
      if (stored.raeen_vpn_active !== undefined) {
        isVpnActive = stored.raeen_vpn_active === true;
      }
      if (stored.raeen_vpn_node_config) {
        activeVpnNode = stored.raeen_vpn_node_config;
      }
      if (stored.raeen_vpn_webrtc !== undefined) {
        webrtcSealed = stored.raeen_vpn_webrtc !== false;
      }
      if (stored.raeen_vpn_killswitch !== undefined) {
        killSwitchEnabled = stored.raeen_vpn_killswitch === true;
      }

      // Check real Chrome proxy level of control
      if ((globalThis as any).chrome?.proxy?.settings) {
        (globalThis as any).chrome.proxy.settings.get({ incognito: false }, (config: any) => {
          if (config && config.levelOfControl === 'controlled_by_this_extension') {
            isVpnActive = true;
          }
        });
      }

      // Enforce WebRTC hardware leak protection
      if (webrtcSealed) {
        try {
          const privacy = (globalThis as any).chrome?.privacy;
          if (privacy?.network?.webRTCIPHandlingPolicy) {
            privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  restoreVpnState();

  // Native Chrome runtime messaging with async sendResponse pattern (return true)
  (globalThis as any).chrome?.runtime?.onMessage?.addListener((request: any, sender: any, sendResponse: (res: any) => void) => {
    (async () => {
      try {
        if (request.action === 'open_dashboard' && sender.tab?.id) {
          await clearServiceWorkers();
          const url = browser.runtime.getURL('/newtab.html') + (request.openSettings ? '?no_redirect=true&settings=true' : '?no_redirect=true');
          await browser.tabs.update(sender.tab.id, { url });
          sendResponse({ success: true });
          return;
        }
        
        if (request.action === 'open_tab' && request.url) {
          await browser.tabs.create({ url: request.url });
          sendResponse({ success: true });
          return;
        }
        
        if (request.action === 'vpn_connect') {
          const {
            scheme = 'socks5',
            host = '127.0.0.1',
            port = 9050,
            nodeName = 'Secure VPN',
            isTor = false,
            isShieldOnly = false,
            endpoints = [],
            killSwitch = false
          } = request.payload || {};

          killSwitchEnabled = !!killSwitch;
          const chromeProxy = (globalThis as any).chrome?.proxy;
          if (!chromeProxy || !chromeProxy.settings) {
            sendResponse({ success: false, error: 'Chrome Proxy API not available or permission denied.' });
            return;
          }

          let proxyConfig: any;
          if (isShieldOnly || scheme === 'direct') {
            proxyConfig = { mode: 'direct' };
          } else if (scheme === 'http' || scheme === 'https' || scheme === 'socks4') {
            proxyConfig = {
              mode: 'fixed_servers',
              rules: {
                singleProxy: {
                  scheme: scheme.toLowerCase(),
                  host: host,
                  port: parseInt(String(port), 10)
                },
                bypassList: ['<local>', 'localhost', '127.0.0.1']
              }
            };
          } else if (isTor || (scheme || '').toLowerCase() === 'socks5') {
            // High-resilience PAC script for SOCKS5/Tor routing
            // If killSwitch is true, traffic never falls back to DIRECT (zero leaks)
            // If killSwitch is false, fallback to DIRECT ensures zero-break continuous browsing
            const fallbackChain = killSwitchEnabled
              ? `SOCKS5 ${host || '127.0.0.1'}:${port || 9050}; SOCKS5 127.0.0.1:9150`
              : `SOCKS5 ${host || '127.0.0.1'}:${port || 9050}; SOCKS5 127.0.0.1:9150; DIRECT`;

            const pacScript = `
              function FindProxyForURL(url, host) {
                if (isPlainHostName(host) || 
                    shExpMatch(host, "*.local") || 
                    shExpMatch(host, "127.0.0.1") || 
                    shExpMatch(host, "localhost") ||
                    shExpMatch(host, "*.internal")) {
                  return "DIRECT";
                }
                return "${fallbackChain}";
              }
            `;
            proxyConfig = {
              mode: 'pac_script',
              pacScript: { data: pacScript }
            };
          } else {
            const candidateEndpoints = Array.isArray(endpoints) && endpoints.length > 0
              ? endpoints
              : [{ host, port, scheme }];

            const proxyChain = candidateEndpoints.map((ep: any) => {
              const sc = (ep.scheme || scheme || 'http').toLowerCase();
              const kw = sc === 'socks5' ? 'SOCKS5' : (sc === 'https' ? 'HTTPS' : (sc === 'socks4' ? 'SOCKS' : 'PROXY'));
              return `${kw} ${ep.host}:${ep.port}`;
            }).join('; ') + (killSwitchEnabled ? '' : '; DIRECT');

            const pacScript = `
              function FindProxyForURL(url, host) {
                if (isPlainHostName(host) || 
                    shExpMatch(host, "*.local") || 
                    shExpMatch(host, "127.0.0.1") || 
                    shExpMatch(host, "localhost") ||
                    shExpMatch(host, "*.internal")) {
                  return "DIRECT";
                }
                return "${proxyChain}";
              }
            `;
            proxyConfig = {
              mode: 'pac_script',
              pacScript: { data: pacScript }
            };
          }

          chromeProxy.settings.set({
            value: proxyConfig,
            scope: 'regular'
          }, async () => {
            const err = (globalThis as any).chrome?.runtime?.lastError;
            if (err) {
              console.error('Proxy settings error:', err);
              sendResponse({ success: false, error: err.message || 'Failed to apply proxy settings' });
              return;
            }
            isVpnActive = true;
            activeVpnNode = { scheme, host, port, nodeName, isTor, isShieldOnly, killSwitch: killSwitchEnabled };
            
            // Persist state to survive MV3 worker restarts
            await persistVpnState({
              raeen_vpn_active: true,
              raeen_vpn_node_config: activeVpnNode,
              raeen_vpn_killswitch: killSwitchEnabled
            });

            // Enforce hardware WebRTC leak protection
            try {
              const privacy = (globalThis as any).chrome?.privacy;
              if (privacy?.network?.webRTCIPHandlingPolicy) {
                privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
              }
            } catch (e) {}

            sendResponse({ success: true, activeVpnNode, isVpnActive });
          });
          return;
        }
        
        if (request.action === 'vpn_disconnect') {
          const chromeProxy = (globalThis as any).chrome?.proxy;
          const finalizeDisconnect = async () => {
            isVpnActive = false;
            activeVpnNode = null;
            await persistVpnState({
              raeen_vpn_active: false,
              raeen_vpn_node_config: null
            });

            // Only clear WebRTC leak shield if user turned off the shield toggle
            if (!webrtcSealed) {
              try {
                const privacy = (globalThis as any).chrome?.privacy;
                if (privacy?.network?.webRTCIPHandlingPolicy) {
                  privacy.network.webRTCIPHandlingPolicy.clear({});
                }
              } catch (e) {}
            }
            sendResponse({ success: true });
          };

          if (chromeProxy?.settings) {
            chromeProxy.settings.clear({ scope: 'regular' }, () => {
              finalizeDisconnect();
            });
          } else {
            finalizeDisconnect();
          }
          return;
        }
        
        if (request.action === 'vpn_get_status') {
          const chromeProxy = (globalThis as any).chrome?.proxy;
          if (chromeProxy?.settings) {
            chromeProxy.settings.get({ incognito: false }, (config: any) => {
              const isControlled = config && config.levelOfControl === 'controlled_by_this_extension';
              sendResponse({
                success: true,
                isActive: isControlled || isVpnActive,
                activeVpnNode,
                levelOfControl: config?.levelOfControl || 'not_controllable',
                webrtcSealed,
                killSwitchEnabled
              });
            });
          } else {
            sendResponse({ 
              success: true, 
              isActive: isVpnActive, 
              activeVpnNode, 
              webrtcSealed, 
              killSwitchEnabled 
            });
          }
          return;
        }
        
        if (request.action === 'webrtc_shield_set') {
          webrtcSealed = request.enabled !== false;
          await persistVpnState({ raeen_vpn_webrtc: webrtcSealed });
          const privacy = (globalThis as any).chrome?.privacy;
          if (privacy?.network?.webRTCIPHandlingPolicy) {
            privacy.network.webRTCIPHandlingPolicy.set({
              value: webrtcSealed ? 'disable_non_proxied_udp' : 'default'
            }, () => {
              sendResponse({ success: true, enabled: webrtcSealed });
            });
          } else {
            sendResponse({ success: false, error: 'WebRTC privacy API unavailable' });
          }
          return;
        }

        if (request.action === 'killswitch_set') {
          killSwitchEnabled = !!request.enabled;
          await persistVpnState({ raeen_vpn_killswitch: killSwitchEnabled });
          sendResponse({ success: true, killSwitchEnabled });
          return;
        }
        
        if (request.action === 'emergency_nuclear_purge') {
          if (browser.browsingData && browser.browsingData.remove) {
            await browser.browsingData.remove({
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
            });
            sendResponse({ success: true, purgedAt: Date.now() });
          } else {
            sendResponse({ success: false, error: 'browsingData API unavailable' });
          }
          return;
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || String(err) });
      }
    })();
    return true; // Keep channel open for async sendResponse in Chrome MV3
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
      browser.tabs.onCreated.addListener((tab) => {
        if (tab.id) {
          redirectToDashboard(tab.id, tab.url || tab.pendingUrl);
        }
      });

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
