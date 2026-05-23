import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'NewTab — Minimalist Productivity Dashboard',
    description: 'A premium, minimalist new tab dashboard with integrated AI workflows and focus features.',
    version: '2.0.0',
    permissions: [
      'topSites',
      'storage',
      'unlimitedStorage',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
      'browsingData',
      'tabs'
    ],
    host_permissions: [
      'https://suggestqueries.google.com/*',
      'https://google.com/*',
      'https://*.google.com/*',
      'https://google.co.in/*',
      'https://*.google.co.in/*',
      'https://*.gstatic.com/*',
      'https://*.googleusercontent.com/*',
      'https://bing.com/*',
      'https://*.bing.com/*',
      'https://*.live.com/*',
      'https://*.microsoftonline.com/*',
      'https://bing.biturl.top/*'
    ],
    declarative_net_request: {
      rule_resources: [{
        id: 'ruleset_1',
        enabled: true,
        path: 'rules.json'
      }]
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src https://google.com https://*.google.com https://google.co.in https://*.google.co.in https://bing.com https://*.bing.com https://*.microsoft.com;"
    }
  }
});
