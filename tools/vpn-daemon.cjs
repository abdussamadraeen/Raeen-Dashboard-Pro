/**
 * Privacy VPN & Tor Engine Controller
 * Manages Tor daemon process and exposes a local HTTP bridge (127.0.0.1:9052)
 * for dynamic on-the-fly country routing in the Chrome extension.
 */

const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const TOR_EXE = path.join(__dirname, 'tor', 'tor', 'tor.exe');
const TOR_RC = path.join(__dirname, 'tor', 'torrc');
const CONTROL_PORT = 9051;
const SOCKS_PORT = 9050;
const HTTP_BRIDGE_PORT = 9052;

let torProcess = null;
let currentCountry = 'auto';
let isBootstrapped = false;
let bootstrapProgress = 0;
let isRestarting = false;

function checkTorPort(port = CONTROL_PORT) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
  });
}

function sendTorControlCommand(commands) {
  const cmdList = Array.isArray(commands) ? commands : [commands];
  const fullCmds = ['AUTHENTICATE ""', ...cmdList];

  return new Promise((resolve, reject) => {
    const socket = net.connect(CONTROL_PORT, '127.0.0.1', () => {
      socket.write(fullCmds.join('\r\n') + '\r\n');
    });

    let buffer = '';
    socket.on('data', (d) => {
      buffer += d.toString();
      const count = (buffer.match(/^250/gm) || []).length;
      if (count >= fullCmds.length) {
        socket.destroy();
        resolve(buffer);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      socket.destroy();
      resolve(buffer);
    }, 2000);
  });
}

async function queryBootstrapPhase() {
  try {
    const res = await sendTorControlCommand('GETINFO status/bootstrap-phase');
    // Format: 250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"
    const match = res.match(/PROGRESS=(\d+)/);
    if (match) {
      bootstrapProgress = parseInt(match[1], 10);
      isBootstrapped = bootstrapProgress >= 100;
      return { progress: bootstrapProgress, done: isBootstrapped };
    }
  } catch (e) {
    // Control port might be initializing
  }
  return { progress: bootstrapProgress, done: isBootstrapped };
}

async function startTor() {
  if (torProcess) return;

  const controlOk = await checkTorPort(CONTROL_PORT);
  const socksOk = await checkTorPort(SOCKS_PORT);

  if (controlOk && socksOk) {
    console.log('[VPN Engine] ✓ Tor is already active on 127.0.0.1:9050/9051!');
    await queryBootstrapPhase();
    return;
  }

  console.log('[VPN Engine] Starting Tor daemon...');
  torProcess = spawn(TOR_EXE, ['-f', TOR_RC], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  torProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Bootstrapped 100%')) {
      isBootstrapped = true;
      bootstrapProgress = 100;
      console.log('[VPN Engine] ✓ Tor network 100% ready for routing!');
    }
  });

  torProcess.stderr.on('data', (chunk) => {
    const err = chunk.toString().trim();
    if (err) console.error('[Tor Error]', err);
  });

  torProcess.on('exit', (code) => {
    console.log(`[VPN Engine] Tor process exited. Code: ${code}`);
    torProcess = null;
    isBootstrapped = false;
    bootstrapProgress = 0;
    if (!isRestarting && code !== 0) {
      isRestarting = true;
      setTimeout(async () => {
        isRestarting = false;
        await startTor();
      }, 3000);
    }
  });

  // Query bootstrap status after startup
  setTimeout(async () => {
    await queryBootstrapPhase();
  }, 2000);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${HTTP_BRIDGE_PORT}`);

  if (url.pathname === '/set-country') {
    const cc = (url.searchParams.get('cc') || 'auto').toLowerCase().trim();
    currentCountry = cc;
    try {
      if (cc && cc !== 'auto' && cc !== 'tor' && cc !== 'direct' && cc !== 'custom') {
        await sendTorControlCommand([`SETCONF ExitNodes={${cc}} StrictNodes=0`, 'SIGNAL NEWNYM']);
      } else {
        await sendTorControlCommand(['SETCONF ExitNodes= StrictNodes=0', 'SIGNAL NEWNYM']);
      }
      await queryBootstrapPhase();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        country: cc, 
        bootstrapped: isBootstrapped,
        bootstrapProgress 
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  } else if (url.pathname === '/rotate' || url.pathname === '/newnym') {
    try {
      await sendTorControlCommand('SIGNAL NEWNYM');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Circuit rotated successfully' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  } else if (url.pathname === '/status') {
    const [runningControl, runningSocks] = await Promise.all([
      checkTorPort(CONTROL_PORT),
      checkTorPort(SOCKS_PORT)
    ]);
    const running = (runningControl && runningSocks) || !!torProcess;
    if (runningControl) {
      await queryBootstrapPhase();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      running,
      bootstrapped: isBootstrapped || running,
      bootstrapProgress: isBootstrapped ? 100 : bootstrapProgress,
      activeCountry: currentCountry,
      socksPort: SOCKS_PORT,
      controlPort: CONTROL_PORT,
      engineVersion: '2.2.0-universe'
    }));
  } else if (url.pathname === '/circuit') {
    try {
      const circ = await sendTorControlCommand('GETINFO circuit-status');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, circuits: circ.trim().split('\r\n') }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(HTTP_BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`[VPN Engine] Bridge active on http://127.0.0.1:${HTTP_BRIDGE_PORT}`);
  startTor();
});

process.on('SIGINT', () => {
  if (torProcess) torProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  if (torProcess) torProcess.kill();
  process.exit();
});
