export default defineBackground(() => {
  // Listen for actions from content scripts
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'open_dashboard' && sender.tab?.id) {
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
