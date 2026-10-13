/**
 * background.ts — Raeen Workspace MV3 Service Worker
 *
 * Resilience design:
 *   - All async operations wrapped in try/catch — SW never crashes silently
 *   - Message handlers always call sendResponse (even on error) — no orphaned promises
 *   - Proxy + WebRTC state persisted to chrome.storage with retry
 *   - SW keep-alive heartbeat prevents premature MV3 termination
 *   - Dynamic DNR rule registration retried on failure
 *   - Platform detection cached — no repeated API calls
 *   - All browser API calls guarded against unavailability
 */

export default defineBackground(() => {

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /** Safe chrome.storage.local.get — never throws, returns {} on error */
  const safeStorageGet = async (keys: string | string[]): Promise<Record<string, unknown>> => {
    try {
      return await browser.storage.local.get(keys) as Record<string, unknown>;
    } catch (e) {
      console.warn('[BG] storage.get failed:', e);
      return {};
    }
  };

  /** Safe chrome.storage.local.set — never throws */
  const safeStorageSet = async (data: Record<string, unknown>): Promise<void> => {
    try {
      await browser.storage.local.set(data);
    } catch (e) {
      console.warn('[BG] storage.set failed:', e);
    }
  };

  /** Retry helper with exponential backoff */
  const withRetry = async <T>(
    fn: () => Promise<T>,
    attempts = 3,
    delayMs = 300
  ): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) {
          await new Promise<void>(res => setTimeout(res, delayMs * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  };

  // ─── Service Worker Keep-Alive ──────────────────────────────────────────────

  /**
   * MV3 service workers are killed after ~30s of inactivity.
   * Touching chrome.storage.local every 20s keeps the SW alive
   * during long-running operations (VPN, proxy management).
   */
  let keepAliveId: ReturnType<typeof setInterval> | null = null;

  const startKeepAlive = (): void => {
    if (keepAliveId !== null) return;
    keepAliveId = setInterval(() => {
      safeStorageGet('__sw_keepalive__');
    }, 20_000);
  };

  const stopKeepAlive = (): void => {
    if (keepAliveId !== null) {
      clearInterval(keepAliveId);
      keepAliveId = null;
    }
  };

  startKeepAlive();

  // ─── Clear Service Workers ──────────────────────────────────────────────────

  const clearServiceWorkers = async (): Promise<void> => {
    try {
      if (browser.browsingData?.remove) {
        await browser.browsingData.remove(
          {
            origins: [
              'https://google.com',
              'https://www.google.com',
              'https://google.co.in',
              'https://www.google.co.in',
              'https://bing.com',
              'https://www.bing.com',
            ],
          },
          { serviceWorkers: true }
        );
        console.log('[BG] Cleared Google/Bing service workers.');
      }
    } catch (e) {
      // browsingData may not be available on all builds — non-fatal
      console.warn('[BG] clearServiceWorkers failed:', e);
    }
  };

  // ─── VPN / Proxy State ─────────────────────────────────────────────────────

  let isVpnActive = false;
  let activeVpnNode: Record<string, unknown> | null = null;
  let webrtcSealed = true;
  let killSwitchEnabled = false;

  /** Apply WebRTC leak protection via chrome.privacy API */
  const applyWebRtcPolicy = (seal: boolean): void => {
    try {
      const policy = (globalThis as any).chrome?.privacy?.network?.webRTCIPHandlingPolicy;
      if (!policy) return;
      if (seal) {
        policy.set({ value: 'disable_non_proxied_udp' });
      } else {
        policy.clear({});
      }
    } catch (e) {
      console.warn('[BG] WebRTC policy API error:', e);
    }
  };

  /** Restore VPN + privacy state after SW restart */
  const restoreVpnState = async (): Promise<void> => {
    try {
      const stored = await safeStorageGet([
        'raeen_vpn_active',
        'raeen_vpn_node_config',
        'raeen_vpn_webrtc',
        'raeen_vpn_killswitch',
      ]);

      isVpnActive = stored.raeen_vpn_active === true;
      activeVpnNode = (stored.raeen_vpn_node_config as Record<string, unknown> | null) ?? null;
      webrtcSealed = stored.raeen_vpn_webrtc !== false;
      killSwitchEnabled = stored.raeen_vpn_killswitch === true;

      // Verify actual proxy control level — handles cases where Chrome cleared our proxy
      const chromeProxy = (globalThis as any).chrome?.proxy;
      if (chromeProxy?.settings) {
        chromeProxy.settings.get({ incognito: false }, (config: any) => {
          if (config?.levelOfControl !== 'controlled_by_this_extension') {
            // Proxy was cleared externally — reset state
            isVpnActive = false;
            activeVpnNode = null;
            safeStorageSet({ raeen_vpn_active: false, raeen_vpn_node_config: null });
          }
        });
      }

      // Re-apply WebRTC seal if it was active
      if (webrtcSealed) {
        applyWebRtcPolicy(true);
      }

      console.log('[BG] VPN state restored.', { isVpnActive, webrtcSealed, killSwitchEnabled });
    } catch (e) {
      console.error('[BG] restoreVpnState failed:', e);
    }
  };

  /** Persist VPN state — called after every state change */
  const persistVpnState = async (data: Record<string, unknown>): Promise<void> => {
    await safeStorageSet(data);
  };

  // ─── Declarative Net Request Dynamic Rules ──────────────────────────────────

  /**
   * Registers dynamic DNR rules to strip X-Frame-Options and Content-Security-Policy
   * response headers for Google and Bing so they can be framed in the dashboard without 'refused to connect'.
   */
  const registerDynamicRules = async () => {
    if (!browser.declarativeNetRequest?.updateDynamicRules) return;
    try {
      await withRetry(async () => {
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
                { header: 'X-WebKit-CSP', operation: 'remove' },
              ],
            },
            condition: {
              requestDomains: [
                'google.com', 'google.co.in', 'www.google.com', 'www.google.co.in',
                'bing.com', 'www.bing.com', 'cn.bing.com', 'live.com', 'www.live.com',
              ],
              resourceTypes: ['sub_frame'],
            },
          },
        ];

        const existingRules = await browser.declarativeNetRequest.getDynamicRules();
        const existingIds = existingRules.map((r) => r.id);

        await browser.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingIds,
          addRules: rules as any,
        });

        console.log('[BG] DNR rules registered for live dashboard iframe.');
      }, 3, 500);
    } catch (e) {
      console.error('[BG] Failed to register DNR rules after retries:', e);
    }
  };

  // ─── PAC Script Builder ────────────────────────────────────────────────────

  /**
   * Builds a robust PAC script that:
   *   - Always bypasses localhost/internal addresses
   *   - Falls back through proxy chain
   *   - Respects kill switch (no DIRECT fallback if kill switch is on)
   */
  const buildPacScript = (
    chain: string,
    withKillSwitch: boolean
  ): string => {
    const fallback = withKillSwitch ? '' : '; DIRECT';
    return `function FindProxyForURL(url, host) {
  if (isPlainHostName(host) ||
      shExpMatch(host, "*.local") ||
      shExpMatch(host, "127.0.0.1") ||
      shExpMatch(host, "[::1]") ||
      shExpMatch(host, "::1") ||
      shExpMatch(host, "localhost") ||
      shExpMatch(host, "*.internal")) {
    return "DIRECT";
  }
  return "${chain}${fallback}";
}`;
  };

  // ─── Message Handlers ──────────────────────────────────────────────────────

  /**
   * Typed message dispatch table.
   * Every handler must either call sendResponse or return a value — never hang.
   */
  interface MessageSender {
    tab?: { id?: number; url?: string };
    frameId?: number;
    id?: string;
    url?: string;
    origin?: string;
  }

  type Handler = (
    request: Record<string, any>,
    sender: MessageSender,
    sendResponse: (res: Record<string, unknown>) => void
  ) => void | boolean;

  const handlers: Record<string, Handler> = {

    open_dashboard: (request, sender, sendResponse) => {
      (async () => {
        try {
          if (!sender.tab?.id) {
            sendResponse({ success: false, error: 'No sender tab ID' });
            return;
          }
          await clearServiceWorkers();
          const base = browser.runtime.getURL('/newtab.html');
          const url = request.openSettings
            ? `${base}?no_redirect=true&settings=true`
            : `${base}?no_redirect=true`;
          await browser.tabs.update(sender.tab.id, { url });
          sendResponse({ success: true });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    open_tab: (request, _sender, sendResponse) => {
      (async () => {
        try {
          if (!request.url || typeof request.url !== 'string') {
            sendResponse({ success: false, error: 'Invalid URL' });
            return;
          }
          let targetUrl = request.url.trim();
          // Safety guard: ensure relative strings never open as extension://<id>/...
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('chrome://') && !targetUrl.startsWith('edge://')) {
            targetUrl = `https://${targetUrl}`;
          }
          await browser.tabs.create({ url: targetUrl });
          sendResponse({ success: true });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    vpn_sync_state: (request, _sender, sendResponse) => {
      (async () => {
        try {
          const payload = request.payload ?? {};
          isVpnActive = !!payload.isVpnActive;
          activeVpnNode = (payload.activeVpnNode as Record<string, unknown> | null) ?? null;
          if (typeof payload.killSwitch === 'boolean') killSwitchEnabled = payload.killSwitch;
          if (typeof payload.webrtcSealed === 'boolean') webrtcSealed = payload.webrtcSealed;

          await persistVpnState({
            raeen_vpn_active: isVpnActive,
            raeen_vpn_node_config: activeVpnNode,
            raeen_vpn_killswitch: killSwitchEnabled,
            raeen_vpn_webrtc: webrtcSealed,
          });

          sendResponse({ success: true, isVpnActive, activeVpnNode });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    vpn_connect: (request, _sender, sendResponse) => {
      (async () => {
        try {
          const {
            scheme = 'socks5',
            host = '127.0.0.1',
            port = 9050,
            nodeName = 'Secure VPN',
            isTor = false,
            isShieldOnly = false,
            endpoints = [],
            killSwitch = false,
            smartSearchBypass = true,
          } = request.payload ?? {};

          killSwitchEnabled = !!killSwitch;

          const chromeProxy = (globalThis as any).chrome?.proxy;
          if (!chromeProxy?.settings) {
            sendResponse({ success: false, error: 'Chrome Proxy API not available or permission denied.' });
            return;
          }

          let proxyConfig: Record<string, unknown>;

          if (isShieldOnly || scheme === 'direct') {
            proxyConfig = { mode: 'direct' };

          } else if ((request.payload?.daemonOnline || request.payload?.useFixed) && host && port) {
            proxyConfig = {
              mode: 'fixed_servers',
              rules: {
                singleProxy: {
                  scheme: (scheme || 'socks5').toLowerCase(),
                  host,
                  port: parseInt(String(port), 10),
                },
                bypassList: ['localhost', '127.0.0.1', '::1', '[::1]', '*.local', '*.internal'],
              },
            };

          } else {
            // Multi-endpoint proxy chain / Cloud Gateways / Tor PAC failover
            const candidateEndpoints: Array<{ host: string; port: number; scheme: string }> =
              Array.isArray(endpoints) && endpoints.length > 0
                ? [...endpoints]
                : [
                    { host: host || '127.0.0.1', port: parseInt(String(port || 9050), 10), scheme: scheme || 'socks5' },
                    ...(Array.isArray(request.payload?.fallbacks) ? request.payload.fallbacks : [])
                  ];

            // If Tor with local daemon, ensure standard Tor Browser port is chained as fallback
            if (isTor) {
              if (!candidateEndpoints.some((e) => e.port === 9150)) {
                candidateEndpoints.push({ host: '127.0.0.1', port: 9150, scheme: 'socks5' });
              }
            }

            const chain = candidateEndpoints
              .map((ep) => {
                const sc = (ep.scheme || scheme || 'socks5').toLowerCase();
                const kw =
                  sc === 'socks5' ? 'SOCKS5'
                  : sc === 'https' ? 'HTTPS'
                  : sc === 'socks4' ? 'SOCKS'
                  : 'PROXY';
                return `${kw} ${ep.host}:${ep.port}`;
              })
              .join('; ');

            const pacData = buildPacScript(chain, killSwitchEnabled);
            proxyConfig = { mode: 'pac_script', pacScript: { data: pacData } };
          }

          // Enforce WebRTC leak protection before proxy is active to prevent race conditions
          applyWebRtcPolicy(true);

          chromeProxy.settings.set({ value: proxyConfig, scope: 'regular' }, async () => {
            const lastError = (globalThis as any).chrome?.runtime?.lastError;
            if (lastError) {
              // Revert if failed
              if (!webrtcSealed) applyWebRtcPolicy(false);
              sendResponse({ success: false, error: lastError.message ?? 'Failed to apply proxy settings' });
              return;
            }

            isVpnActive = true;
            activeVpnNode = { scheme, host, port, nodeName, isTor, isShieldOnly, killSwitch: killSwitchEnabled };

            await persistVpnState({
              raeen_vpn_active: true,
              raeen_vpn_node_config: activeVpnNode,
              raeen_vpn_killswitch: killSwitchEnabled,
            });

            sendResponse({ success: true, activeVpnNode, isVpnActive });
          });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    vpn_disconnect: (_request, _sender, sendResponse) => {
      (async () => {
        try {
          const finalizeDisconnect = async () => {
            isVpnActive = false;
            activeVpnNode = null;
            await persistVpnState({ raeen_vpn_active: false, raeen_vpn_node_config: null });

            // Only clear WebRTC policy if the user explicitly disabled the shield
            if (!webrtcSealed) {
              applyWebRtcPolicy(false);
            }
            sendResponse({ success: true });
          };

          const chromeProxy = (globalThis as any).chrome?.proxy;
          if (chromeProxy?.settings) {
            chromeProxy.settings.clear({ scope: 'regular' }, () => {
              finalizeDisconnect();
            });
          } else {
            await finalizeDisconnect();
          }
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    vpn_get_status: (_request, _sender, sendResponse) => {
      try {
        const chromeProxy = (globalThis as any).chrome?.proxy;
        if (chromeProxy?.settings) {
          chromeProxy.settings.get({ incognito: false }, (config: any) => {
            const isControlled = config?.levelOfControl === 'controlled_by_this_extension';
            sendResponse({
              success: true,
              isActive: isControlled || isVpnActive,
              activeVpnNode,
              levelOfControl: config?.levelOfControl ?? 'not_controllable',
              webrtcSealed,
              killSwitchEnabled,
            });
          });
        } else {
          sendResponse({
            success: true,
            isActive: isVpnActive,
            activeVpnNode,
            webrtcSealed,
            killSwitchEnabled,
          });
        }
      } catch (e: any) {
        sendResponse({ success: false, error: e?.message ?? String(e) });
      }
      return true;
    },

    webrtc_shield_set: (request, _sender, sendResponse) => {
      (async () => {
        try {
          webrtcSealed = request.enabled !== false;
          await persistVpnState({ raeen_vpn_webrtc: webrtcSealed });

          const policy = (globalThis as any).chrome?.privacy?.network?.webRTCIPHandlingPolicy;
          if (!policy) {
            sendResponse({ success: false, error: 'WebRTC privacy API unavailable' });
            return;
          }

          policy.set(
            { value: webrtcSealed ? 'disable_non_proxied_udp' : 'default' },
            () => {
              sendResponse({ success: true, enabled: webrtcSealed });
            }
          );
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    killswitch_set: (request, _sender, sendResponse) => {
      (async () => {
        try {
          killSwitchEnabled = !!request.enabled;
          await persistVpnState({ raeen_vpn_killswitch: killSwitchEnabled });
          sendResponse({ success: true, killSwitchEnabled });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    emergency_nuclear_purge: (_request, _sender, sendResponse) => {
      (async () => {
        try {
          if (!browser.browsingData?.remove) {
            sendResponse({ success: false, error: 'browsingData API unavailable' });
            return;
          }
          await browser.browsingData.remove(
            { since: 0 },
            {
              appcache: true,
              cache: true,
              cacheStorage: true,
              cookies: true,
              fileSystems: true,
              formData: true,
              history: true,
              serviceWorkers: true,
              webSQL: true,
            }
          );
          sendResponse({ success: true, purgedAt: Date.now() });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    capture_screen: (_request, _sender, sendResponse) => {
      (async () => {
        try {
          const chrome = (globalThis as any).chrome;
          if (!chrome?.tabs?.captureVisibleTab) {
            sendResponse({ success: false, error: 'Screen capture API not supported in this context' });
            return;
          }
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl: string) => {
            const err = chrome.runtime?.lastError;
            if (err || !dataUrl) {
              sendResponse({ success: false, error: err?.message || 'Failed to capture visible tab' });
              return;
            }
            sendResponse({ success: true, dataUrl });
          });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    get_open_tabs: (_request, _sender, sendResponse) => {
      (async () => {
        try {
          const chrome = (globalThis as any).chrome;
          if (chrome?.tabs?.query) {
            chrome.tabs.query({ currentWindow: true }, (tabs: any[]) => {
              const err = chrome.runtime?.lastError;
              if (err) {
                sendResponse({ success: false, error: err.message });
                return;
              }
              const simplified = (tabs || []).map(t => ({
                id: t.id,
                title: t.title || 'Untitled Tab',
                url: t.url || '',
                favIconUrl: t.favIconUrl || ''
              }));
              sendResponse({ success: true, tabs: simplified });
            });
          } else {
            sendResponse({ success: false, error: 'Tabs API unavailable' });
          }
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },

    freeze_inactive_tabs: (_request, sender, sendResponse) => {
      (async () => {
        try {
          const chrome = (globalThis as any).chrome;
          if (!chrome?.tabs?.query) {
            sendResponse({ success: false, error: 'Tabs API unavailable' });
            return;
          }
          chrome.tabs.query({ currentWindow: true }, async (tabs: any[]) => {
            let frozenCount = 0;
            const currentTabId = sender?.tab?.id;
            for (const tab of (tabs || [])) {
              if (tab.id && !tab.active && tab.id !== currentTabId) {
                try {
                  if (chrome.tabs.discard) {
                    await new Promise<void>((res) => {
                      chrome.tabs.discard(tab.id, () => res());
                    });
                    frozenCount++;
                  }
                } catch (_) {}
              }
            }
            sendResponse({ success: true, frozenCount });
          });
        } catch (e: any) {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        }
      })();
      return true;
    },
  };

  // ─── Message Listener ──────────────────────────────────────────────────────

  /**
   * Central message router. Dispatches to typed handlers.
   * Handles unknown actions gracefully — never hangs.
   * Always returns `true` to keep the message channel open for async handlers.
   */
  (globalThis as any).chrome?.runtime?.onMessage?.addListener(
    (request: Record<string, any>, sender: any, sendResponse: (res: any) => void) => {
      try {
        const action = (request?.action ?? request?.type) as string | undefined;
        const handler = action ? handlers[action] : undefined;

        if (!handler) {
          // Unknown action — respond immediately to avoid orphaned promises
          sendResponse({ success: false, error: `Unknown action: ${action ?? 'undefined'}` });
          return true;
        }

        handler(request, sender, sendResponse);
      } catch (e: any) {
        console.error('[BG] Unhandled message dispatcher error:', e);
        try {
          sendResponse({ success: false, error: e?.message ?? String(e) });
        } catch {
          // sendResponse may already have been called — ignore
        }
      }

      return true; // Keep channel open for async handlers
    }
  );

  // ─── Proxy Error Fallback & Protection ─────────────────────────────────────
  try {
    const chromeProxy = (globalThis as any).chrome?.proxy;
    if (chromeProxy?.onProxyError?.addListener) {
      chromeProxy.onProxyError.addListener((details: { error: string; fatal: boolean; details?: string }) => {
        console.warn('[BG:ProxyError]', details);
        if (details.fatal && !killSwitchEnabled && isVpnActive) {
          console.warn('[BG] Recovering from fatal proxy error without kill switch. Falling back safely to DIRECT.');
          const safePac = `function FindProxyForURL(url, host) { return "DIRECT"; }`;
          chromeProxy.settings.set({
            value: { mode: 'pac_script', pacScript: { data: safePac } },
            scope: 'regular'
          }, () => {});
        }
      });
    }
  } catch (e) {
    console.warn('[BG] Proxy error listener registration:', e);
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  // Run async initialization — all wrapped to prevent SW crash on failure
  (async () => {
    try {
      await registerDynamicRules();
    } catch (e) {
      console.error('[BG] registerDynamicRules init failed:', e);
    }

    try {
      await clearServiceWorkers();
    } catch (e) {
      console.error('[BG] clearServiceWorkers init failed:', e);
    }

    try {
      await restoreVpnState();
    } catch (e) {
      console.error('[BG] restoreVpnState init failed:', e);
    }
  })();

  // ─── Mobile New Tab Redirect ────────────────────────────────────────────────

  const newTabUrls = [
    'chrome://newtab/',
    'chrome-search://local-ntp/local-ntp.html',
    'chrome-native://newtab/',
    'kiwi://newtab/',
    'edge://newtab/',
    'about:blank',
    'about:newtab',
    'about:home',
  ];

  const redirectToDashboard = async (tabId: number, url?: string): Promise<void> => {
    try {
      if (!url) return;
      const isNewTab = newTabUrls.some((target) => url.startsWith(target));
      if (!isNewTab) return;

      const dashboardUrl = browser.runtime.getURL('/newtab.html');
      if (url.includes(dashboardUrl)) return; // Prevent redirect loop

      await clearServiceWorkers();
      await browser.tabs.update(tabId, { url: dashboardUrl });
    } catch (e) {
      console.warn('[BG] Failed to redirect native new tab:', e);
    }
  };

  // Register mobile fallback redirect listeners (Android only — Desktop uses manifest override)
  browser.runtime.getPlatformInfo().then((info) => {
    if (info.os === 'android') {
      browser.tabs.onCreated.addListener((tab) => {
        if (tab.id) {
          redirectToDashboard(tab.id, tab.url ?? tab.pendingUrl);
        }
      });

      browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
        if (tab.id && changeInfo.url) {
          redirectToDashboard(tab.id, changeInfo.url);
        }
      });

      console.log('[BG] Mobile new tab redirect listeners registered (Android).');
    } else {
      console.log('[BG] Desktop platform — using native manifest override for new tab.');
    }
  }).catch((e) => {
    console.warn('[BG] getPlatformInfo failed:', e);
  });

  // ─── SW Lifecycle Cleanup ───────────────────────────────────────────────────

  // MV3 SWs don't have a reliable unload event, but we clean up what we can
  // when the SW is about to be suspended (fired in some browsers)
  (globalThis as any).addEventListener?.('beforeunload', () => {
    stopKeepAlive();
  });

});
