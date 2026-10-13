import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  publicDir: 'extension-public',
  manifest: {
    name: 'Workspace – Smart New Tab',
    description: 'A premium, minimalist new tab dashboard with integrated AI workflows and focus features.',
    version: '2.2.0',
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
      'browsingData',
      'tabs',
      'search',
      'proxy',
      'privacy',
      'downloads',
      'nativeMessaging'
    ],
    host_permissions: [
      'https://suggestqueries.google.com/*',
      'https://bing.biturl.top/*',
      'https://images.unsplash.com/*',
      'https://*.unsplash.com/*',
      'https://api.unsplash.com/*',
      'https://api.ipify.org/*',
      'https://freeipapi.com/*',
      'https://ipapi.co/*',
      'https://ipwho.is/*',
      'https://icanhazip.com/*',
      'https://check.torproject.org/*',
      'https://1.1.1.1/*',
      'https://api.proxyscrape.com/*',
      'https://raw.githubusercontent.com/*',
      'https://*.uguu.se/*',
      'https://uguu.se/*',
      'https://*.tmpfiles.org/*',
      'https://tmpfiles.org/*',
      'https://*.peerjs.com/*',
      'https://0.peerjs.com/*',
      'http://127.0.0.1/*',
      'http://localhost/*'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https: wss: blob: data: http://127.0.0.1:* http://localhost:* http://127.0.0.1:9052 http://127.0.0.1:9050 http://localhost:9052 http://localhost:9050;"
    },
    web_accessible_resources: [
      {
        resources: ['pdf.worker.mjs'],
        matches: ['<all_urls>']
      }
    ]
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
