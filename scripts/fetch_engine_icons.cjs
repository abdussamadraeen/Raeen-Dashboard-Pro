const https = require('https');
const fs = require('fs');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const dir = path.join(__dirname, '..', 'extension-public', 'icons', 'engines');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const urls = {
    duckduckgo: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/duckduckgo.svg',
    brave: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/brave.svg',
    bing: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/bing.svg',
    chatgpt: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/chatgpt.svg',
    perplexity: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/perplexity.svg',
    claude: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/claude-ai.svg'
  };

  const googleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>`;
  fs.writeFileSync(path.join(dir, 'google.svg'), googleSvg, 'utf8');

  for (const [name, url] of Object.entries(urls)) {
    try {
      const svg = await get(url);
      fs.writeFileSync(path.join(dir, name + '.svg'), svg, 'utf8');
      console.log('Saved', name, svg.length);
    } catch (e) {
      console.error('Failed to get', name, e.message);
    }
  }

  // Also robot_ai icon
  const robotSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#6366F1"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2.5 2.5m9 9L19 19M5 19l2.5-2.5m9-9L19 5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>`;
  fs.writeFileSync(path.join(dir, 'robot_ai.svg'), robotSvg, 'utf8');
  console.log('Saved robot_ai');

  console.log('All engine SVGs saved successfully!');
})();
