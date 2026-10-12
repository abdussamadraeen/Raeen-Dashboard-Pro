/**
 * Native Messaging Host for Chrome / Chromium
 * Allows the Raeen Chrome Extension to automatically launch the Tor Engine daemon
 * directly from browser actions (e.g. clicking Connect VPN or selecting Tor).
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

function sendResponse(obj) {
  const jsonStr = JSON.stringify(obj);
  const buffer = Buffer.from(jsonStr, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

function checkTorBridgeStatus() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:9052/status', { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ running: false });
        }
      });
    });
    req.on('error', () => resolve({ running: false }));
    req.on('timeout', () => { req.destroy(); resolve({ running: false }); });
  });
}

async function startTorDaemon() {
  const daemonPath = path.join(__dirname, 'vpn-daemon.cjs');
  // Spawn detached so it stays alive independently
  const child = spawn('node', [daemonPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: __dirname
  });
  child.unref();

  // Poll for up to 6 seconds for bridge to respond
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 500));
    const status = await checkTorBridgeStatus();
    if (status && status.running) {
      return { success: true, running: true, bootstrapped: status.bootstrapped, port: 9050 };
    }
  }

  return { success: true, running: true, starting: true, port: 9050 };
}

let inputBuffer = Buffer.alloc(0);

process.stdin.on('readable', async () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);

    while (inputBuffer.length >= 4) {
      const msgLen = inputBuffer.readUInt32LE(0);
      if (inputBuffer.length < 4 + msgLen) {
        break; // Wait for full message
      }

      const msgBytes = inputBuffer.subarray(4, 4 + msgLen);
      inputBuffer = inputBuffer.subarray(4 + msgLen);

      let msg = {};
      try {
        msg = JSON.parse(msgBytes.toString('utf8'));
      } catch (err) {
        sendResponse({ success: false, error: 'Malformed JSON' });
        continue;
      }

      const action = msg.action || msg.command || 'start';

      if (action === 'status' || action === 'ping') {
        const status = await checkTorBridgeStatus();
        sendResponse({ success: true, status });
      } else if (action === 'start' || action === 'launch') {
        const current = await checkTorBridgeStatus();
        if (current && current.running) {
          sendResponse({ success: true, alreadyRunning: true, running: true, port: 9050 });
        } else {
          const res = await startTorDaemon();
          sendResponse(res);
        }
      } else if (action === 'stop') {
        try {
          http.get('http://127.0.0.1:9052/stop', () => {}).on('error', () => {});
        } catch {}
        sendResponse({ success: true, stopped: true });
      } else {
        sendResponse({ success: false, error: `Unknown action: ${action}` });
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});
