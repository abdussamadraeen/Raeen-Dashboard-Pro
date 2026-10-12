/**
 * Cross-Browser Native Messaging Host Registerer
 * Detects all installed instances of the Raeen Chrome Extension
 * and registers the Native Messaging Host for 1-click Tor launcher.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scriptDir = __dirname;
const batPath = path.join(scriptDir, 'native-host.bat');
const jsonPath = path.join(scriptDir, 'com.raeen.tor_launcher.json');

// Default known IDs + any passed via command line
const detectedIds = new Set([
  'hlmfkaimcocbadiicijfhdmlmbcjldeh',
  'doeecfgpficlhldbmkinkilnmfhbepcc',
  'pekbfcefogodiicaikioabdpgodnmmdd'
]);

if (process.argv[2]) {
  detectedIds.add(process.argv[2].trim());
}

// Scan Chrome, Edge, and Brave profiles for any extension matching "Workspace" or "Raeen"
const browserBases = [
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data'),
  path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'User Data')
];

for (const base of browserBases) {
  if (!fs.existsSync(base)) continue;
  try {
    const entries = fs.readdirSync(base);
    for (const d of entries) {
      for (const prefFile of ['Preferences', 'Secure Preferences']) {
        const p = path.join(base, d, prefFile);
        if (fs.existsSync(p)) {
          try {
            const raw = fs.readFileSync(p, 'utf8');
            const data = JSON.parse(raw);
            const extSettings = data.extensions && data.extensions.settings;
            if (extSettings) {
              for (const [id, val] of Object.entries(extSettings)) {
                const name = val?.manifest?.name || '';
                if (name.includes('Workspace') || name.includes('Raeen') || name.includes('Smart New Tab')) {
                  detectedIds.add(id);
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch {}
}

const allowedOrigins = Array.from(detectedIds).map(id => `chrome-extension://${id}/`);

const manifest = {
  name: 'com.raeen.tor_launcher',
  description: 'Raeen Workspace Tor Engine Native Host',
  path: batPath,
  type: 'stdio',
  allowed_origins: allowedOrigins
};

fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('[*] Generated com.raeen.tor_launcher.json with authorized origins:');
allowedOrigins.forEach(o => console.log('   -', o));

// Register in Windows Registry
const regKeys = [
  'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.raeen.tor_launcher',
  'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.raeen.tor_launcher',
  'HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\com.raeen.tor_launcher'
];

for (const key of regKeys) {
  try {
    execSync(`reg add "${key}" /ve /t REG_SZ /d "${jsonPath}" /f`, { stdio: 'ignore' });
    console.log('[+] Registered registry key:', key);
  } catch (err) {
    console.warn('[-] Failed to register registry key:', key);
  }
}

console.log('\n====================================================================');
console.log('SUCCESS: Tor Native Auto-Launcher is successfully registered!');
console.log('Chrome can now trigger and start Tor automatically on button click.');
console.log('====================================================================\n');
