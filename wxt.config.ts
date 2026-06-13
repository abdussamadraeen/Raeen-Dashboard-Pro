import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  publicDir: 'extension-public',
  manifest: {
    name: 'Raeen Workspace – Smart New Tab',
    description: 'A premium, minimalist new tab dashboard with integrated AI workflows and focus features.',
    version: '2.1.0',
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png'
      }
    },
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
  },
  vite: () => ({
    build: {
      minify: 'esbuild',
      cssMinify: 'esbuild',
      target: 'esnext'
    },
    esbuild: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true
    }
  })
});
