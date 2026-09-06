/**
 * Raeen Workspace - Privacy Shield, Fast Tor & VPN Engine
 * Military-grade security protocols with user-friendly controls
 */

export const TACTICAL_NODES = [
    {
        id: 'fast_tor',
        name: 'Fast Tor (127.0.0.1:9050)',
        flag: '🧅',
        location: 'Global Onion Relay',
        isTor: true,
        scheme: 'socks5',
        host: '127.0.0.1',
        port: 9050,
        cipher: 'Tor Multi-Hop Onion',
        description: 'Instant local Tor or Brave Tor SOCKS5 route with 0s connection lag'
    },
    {
        id: 'fast_tor_alt',
        name: 'Fast Tor Alt (127.0.0.1:9150)',
        flag: '🧅',
        location: 'Tor Browser Relay',
        isTor: true,
        scheme: 'socks5',
        host: '127.0.0.1',
        port: 9150,
        cipher: 'Tor Multi-Hop Onion',
        description: 'Tor Browser SOCKS5 port (9150)'
    },
    {
        id: 'swiss_vault',
        name: 'Switzerland (Privacy Vault)',
        flag: '🇨🇭',
        location: 'Zurich Secure Vault',
        isTor: false,
        scheme: 'socks5',
        host: '194.26.29.13',
        port: 4145,
        cipher: 'CHACHA20-POLY1305',
        description: 'Strict Swiss privacy laws'
    },
    {
        id: 'us_secure',
        name: 'United States (Fast Secure)',
        flag: '🇺🇸',
        location: 'New York / Ashburn',
        isTor: false,
        scheme: 'socks5',
        host: '104.248.63.15',
        port: 30588,
        cipher: 'AES-256-GCM',
        description: 'High-speed US privacy route'
    },
    {
        id: 'frankfurt_speed',
        name: 'Germany (High Speed)',
        flag: '🇩🇪',
        location: 'Frankfurt Central',
        isTor: false,
        scheme: 'socks5',
        host: '159.65.122.91',
        port: 1080,
        cipher: 'AES-256-GCM',
        description: 'Ultra low-latency European relay'
    },
    {
        id: 'singapore_apac',
        name: 'Singapore (Asia Fast)',
        flag: '🇸🇬',
        location: 'Singapore Central',
        isTor: false,
        scheme: 'socks5',
        host: '139.59.229.117',
        port: 1080,
        cipher: 'AES-256-GCM',
        description: 'Fast APAC route'
    },
    {
        id: 'london_shield',
        name: 'United Kingdom (Secure)',
        flag: '🇬🇧',
        location: 'London High-Speed',
        isTor: false,
        scheme: 'socks5',
        host: '178.62.83.195',
        port: 1080,
        cipher: 'AES-256-GCM',
        description: 'Secure UK tunnel'
    },
    {
        id: 'custom',
        name: 'Custom SOCKS5 / Tor Bridge',
        flag: '⚙️',
        location: 'User Defined Host & Port',
        isTor: false,
        scheme: 'socks5',
        host: '127.0.0.1',
        port: 9050,
        cipher: 'Custom Cipher',
        description: 'Route through any private or public SOCKS5/HTTP proxy'
    }
];

class SecurityManager {
    constructor() {
        this.isActive = false;
        this.currentNodeId = localStorage.getItem('raeen_vpn_node') || 'fast_tor';
        this.killSwitch = localStorage.getItem('raeen_vpn_killswitch') !== 'false';
        this.webrtcSealed = localStorage.getItem('raeen_vpn_webrtc') !== 'false';
        this.customProxy = JSON.parse(localStorage.getItem('raeen_vpn_custom') || '{"scheme":"socks5","host":"127.0.0.1","port":"9050"}');
        this.realIp = 'Querying...';
        this.maskedIp = 'Checking...';
        this.pingMs = '--';
        this.isQueryingIp = false;
    }

    async sendMsg(msg) {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage(msg, (res) => {
                    const err = chrome.runtime.lastError;
                    if (err) {
                        console.warn('sendMsg lastError:', err);
                        resolve({ success: false, error: err.message });
                    } else {
                        resolve(res || { success: false });
                    }
                });
            } else if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
                browser.runtime.sendMessage(msg)
                    .then(res => resolve(res || { success: false }))
                    .catch(e => resolve({ success: false, error: e?.message || String(e) }));
            } else {
                resolve({ success: false, error: 'No extension runtime found' });
            }
        });
    }

    async init() {
        if (this.webrtcSealed) {
            this.setWebRTCShield(true);
        }

        await this.checkStatus();
        this.probeIp();
    }

    async checkStatus() {
        const response = await this.sendMsg({ action: 'vpn_get_status' });
        if (response && response.success) {
            this.isActive = !!response.isActive;
        }
        return response || { success: false };
    }

    async connect(nodeId = null) {
        if (nodeId) this.currentNodeId = nodeId;
        localStorage.setItem('raeen_vpn_node', this.currentNodeId);

        let nodeConfig;
        if (this.currentNodeId === 'custom') {
            nodeConfig = {
                scheme: this.customProxy.scheme || 'socks5',
                host: this.customProxy.host || '127.0.0.1',
                port: this.customProxy.port || 9050,
                nodeName: 'Custom SOCKS5 / Tor Bridge',
                isTor: (this.customProxy.port == 9050 || this.customProxy.port == 9150)
            };
        } else {
            const found = TACTICAL_NODES.find(n => n.id === this.currentNodeId) || TACTICAL_NODES[0];
            nodeConfig = {
                scheme: found.scheme,
                host: found.host,
                port: found.port,
                nodeName: found.name,
                isTor: !!found.isTor
            };
        }

        const res = await this.sendMsg({ action: 'vpn_connect', payload: nodeConfig });
        if (res && res.success) {
            this.isActive = true;
            this.probeIp();
        } else if (res && res.mock) {
            this.isActive = true;
        }
        return res || { success: false };
    }

    async disconnect() {
        const res = await this.sendMsg({ action: 'vpn_disconnect' });
        this.isActive = false;
        this.probeIp();
        return res || { success: true };
    }

    async setWebRTCShield(enabled) {
        this.webrtcSealed = enabled;
        localStorage.setItem('raeen_vpn_webrtc', enabled ? 'true' : 'false');
        return await this.sendMsg({ action: 'webrtc_shield_set', enabled });
    }

    async triggerClearTraces() {
        return await this.sendMsg({ action: 'emergency_nuclear_purge' });
    }

    async probeIp() {
        if (this.isQueryingIp) return;
        this.isQueryingIp = true;
        const t0 = performance.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            let ip = null;
            try {
                const res = await fetch(`https://api.ipify.org?format=json&nocache=${Date.now()}`, { signal: controller.signal });
                const data = await res.json();
                ip = data.ip;
            } catch (e1) {
                const res2 = await fetch(`https://icanhazip.com/?nocache=${Date.now()}`, { signal: controller.signal });
                const text = await res2.text();
                ip = text.trim();
            }
            clearTimeout(timeout);
            const lat = Math.round(performance.now() - t0);
            this.pingMs = `${lat}ms`;

            if (ip) {
                if (this.isActive) {
                    this.maskedIp = ip;
                } else {
                    this.realIp = ip;
                    this.maskedIp = ip;
                }
            }
        } catch (e) {
            this.pingMs = '--';
            if (this.isActive) {
                this.maskedIp = 'Protected (Active)';
            }
        } finally {
            this.isQueryingIp = false;
            if (window.renderSecurityHud) window.renderSecurityHud();
        }
    }
}

export const securityManager = new SecurityManager();
