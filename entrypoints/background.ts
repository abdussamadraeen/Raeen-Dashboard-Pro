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

  // Listen for actions from content scripts
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'open_dashboard' && sender.tab?.id) {
      clearServiceWorkers();
      const url = browser.runtime.getURL('newtab.html') + '?no_redirect=true&settings=true';
      browser.tabs.update(sender.tab.id, { url });
    } else if (request.action === 'open_tab' && request.url) {
      browser.tabs.create({ url: request.url });
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
        const dashboardUrl = browser.runtime.getURL('newtab.html');
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
});
