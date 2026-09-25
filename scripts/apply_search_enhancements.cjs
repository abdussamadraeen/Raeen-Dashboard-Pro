const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const enginesDir = path.join(root, 'extension-public', 'icons', 'engines');

// Read authentic SVGs
const ddgSvg = fs.readFileSync(path.join(enginesDir, 'duckduckgo.svg'), 'utf8').trim();
const braveSvg = fs.readFileSync(path.join(enginesDir, 'brave.svg'), 'utf8').trim();
const bingSvg = fs.readFileSync(path.join(enginesDir, 'bing.svg'), 'utf8').trim();
const chatgptSvg = fs.readFileSync(path.join(enginesDir, 'chatgpt.svg'), 'utf8').trim();
const perplexitySvg = fs.readFileSync(path.join(enginesDir, 'perplexity.svg'), 'utf8').trim();
const claudeSvg = fs.readFileSync(path.join(enginesDir, 'claude.svg'), 'utf8').trim();
const googleSvg = fs.readFileSync(path.join(enginesDir, 'google.svg'), 'utf8').trim();
const robotSvg = fs.readFileSync(path.join(enginesDir, 'robot_ai.svg'), 'utf8').trim();

const ddgData = 'data:image/svg+xml,' + encodeURIComponent(ddgSvg);
const braveData = 'data:image/svg+xml,' + encodeURIComponent(braveSvg);
const bingData = 'data:image/svg+xml,' + encodeURIComponent(bingSvg);
const chatgptData = 'data:image/svg+xml,' + encodeURIComponent(chatgptSvg);
const perplexityData = 'data:image/svg+xml,' + encodeURIComponent(perplexitySvg);
const claudeData = 'data:image/svg+xml,' + encodeURIComponent(claudeSvg);
const googleData = 'data:image/svg+xml,' + encodeURIComponent(googleSvg);
const robotData = 'data:image/svg+xml,' + encodeURIComponent(robotSvg);

console.log('Read authentic SVGs successfully');

// 1. Update search.js with authentic SVGs & Google options logic
{
  const searchJsPath = path.join(root, 'entrypoints/newtab/js/search.js');
  let content = fs.readFileSync(searchJsPath, 'utf8');

  // Replace SVG constants
  content = content.replace(/export const BRAVE_SVG = "[^"]+";/, `export const BRAVE_SVG = "${braveData}";`);
  content = content.replace(/export const DUCKDUCKGO_SVG = "[^"]+";/, `export const DUCKDUCKGO_SVG = "${ddgData}";`);
  content = content.replace(/export const BING_SVG = "[^"]+";/, `export const BING_SVG = "${bingData}";`);
  content = content.replace(/export const CHATGPT_SVG = "[^"]+";/, `export const CHATGPT_SVG = "${chatgptData}";`);
  content = content.replace(/export const PERPLEXITY_SVG = "[^"]+";/, `export const PERPLEXITY_SVG = "${perplexityData}";`);
  content = content.replace(/export const CLAUDE_SVG = "[^"]+";/, `export const CLAUDE_SVG = "${claudeData}";`);
  content = content.replace(/export const ROBOT_AI_SVG = "[^"]+";/, `export const ROBOT_AI_SVG = "${robotData}";`);

  fs.writeFileSync(searchJsPath, content, 'utf8');
  console.log('search.js SVG constants updated');
}

// 2. Update index.html menu item icons
{
  const htmlPath = path.join(root, 'entrypoints/newtab/index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace each engine menu item image
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="brave">\s*<img src=")[^"]+(" alt="Brave">)/,
    `$1${braveData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="duckduckgo">\s*<img src=")[^"]+(" alt="DuckDuckGo">)/,
    `$1${ddgData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="bing">\s*<img src=")[^"]+(" alt="Bing">)/,
    `$1${bingData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="chatgpt">\s*<img src=")[^"]+(" alt="ChatGPT">)/,
    `$1${chatgptData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="perplexity">\s*<img src=")[^"]+(" alt="Perplexity">)/,
    `$1${perplexityData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="claude">\s*<img src=")[^"]+(" alt="Claude">)/,
    `$1${claudeData}$2`
  );
  html = html.replace(
    /(<button type="button" class="engine-menu-item" data-engine="robot_ai">\s*)[^<]+(<span)/,
    `$1<img src="${robotData}" alt="Robot AI" class="engine-item-icon"> $2`
  );

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('index.html menu icons updated');
}
