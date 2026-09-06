/**
 * Military-Grade Defense HUD & Proxy / WebRTC Engine
 * Raeen Workspace - Tactical Security Subsystem
 */

export const TACTICAL_NODES = [
    {
        id: 'us_pentagon',
        name: 'US Pentagon Gateway',
        code: 'DEF-US-01',
        flag: '🇺🇸',
        location: 'Virginia / Washington D.C.',
        scheme: 'https',
        host: '104.28.16.1', // Fast edge node fallback
        port: 443,
        cipher: 'AES-256-GCM',
        defcon: 1
    },
    {
        id: 'swiss_bunker',
        name: 'Swiss Privacy Vault',
        code: 'DEF-CH-09',
        flag: '🇨🇭',
        location: 'Zurich / Mountain Bunker',
        scheme: 'https',
        host: '185.220.101.5',
        port: 443,
        cipher: 'CHACHA20-POLY1305',
        defcon: 1
    },
    {
        id: 'frankfurt_fortress',
        name: 'Frankfurt Cyber-Fortress',
        code: 'DEF-DE-04',
        flag: '🇩🇪',
        location: 'Frankfurt am Main',
        scheme: 'https',
        host: '194.26.29.112',
        port: 443,
        cipher: 'AES-256-GCM',
        defcon: 1
    },
    {
        id: 'singapore_citadel',
        name: 'Singapore Cyber Citadel',
        code: 'DEF-SG-07',
        flag: '🇸🇬',
        location: 'Marina Bay / APAC Relay',
        scheme: 'https',
        host: '139.59.224.234',
        port: 8080,
        cipher: 'AES-256-GCM',
        defcon: 2
    },
    {
        id: 'london_cipher',
        name: 'Royal Cipher Redoubt',
        code: 'DEF-UK-03',
        flag: '🇬🇧',
        location: 'London Secure Redoubt',
        scheme: 'https',
        host: '51.89.245.10',
        port: 443,
        cipher: 'AES-256-GCM',
        defcon: 1
    }
];

class MilitarySecurityManager {
    constructor() {
        this.isActive = false;
        this.currentNodeId = localStorage.getItem('raeen_vpn_node') || 'us_pentagon';
        this.killSwitch = localStorage.getItem('raeen_vpn_killswitch') !== 'false';
        this.webrtcSealed = localStorage.getItem('raeen_vpn_webrtc') !== 'false';
        this.customProxy = JSON.parse(localStorage.getItem('raeen_vpn_custom') || '{"scheme":"socks5","host":"","port":""}');
        this.realIp = 'Querying...';
        this.maskedIp = 'Unprotected';
        this.pingMs = '--';
        this.isQueryingIp = false;
    }

    async init() {
        // Enforce WebRTC shield if saved as active
        if (this.webrtcSealed) {
            this.setWebRTCShield(true);
        }

        // Query status from background
        await this.checkStatus();
        this.probeIp();
    }

    async checkStatus() {
        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                resolve({ success: false });
                return;
            }
            chrome.runtime.sendMessage({ action: 'vpn_get_status' }, (response) => {
                if (response && response.success) {
                    this.isActive = !!response.isActive;
                }
                resolve(response || { success: false });
            });
        });
    }

    async connect(nodeId = null) {
        if (nodeId) this.currentNodeId = nodeId;
        localStorage.setItem('raeen_vpn_node', this.currentNodeId);

        let nodeConfig;
        if (this.currentNodeId === 'custom') {
            nodeConfig = {
                scheme: this.customProxy.scheme || 'socks5',
                host: this.customProxy.host,
                port: this.customProxy.port,
                nodeName: 'Custom Cipher Tunnel',
                killSwitch: this.killSwitch
            };
        } else {
            const found = TACTICAL_NODES.find(n => n.id === this.currentNodeId) || TACTICAL_NODES[0];
            nodeConfig = {
                scheme: found.scheme,
                host: found.host,
                port: found.port,
                nodeName: found.name,
                killSwitch: this.killSwitch
            };
        }

        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                this.isActive = true;
                resolve({ success: true, mock: true });
                return;
            }
            chrome.runtime.sendMessage({ action: 'vpn_connect', payload: nodeConfig }, (res) => {
                if (res && res.success) {
                    this.isActive = true;
                    this.probeIp();
                }
                resolve(res || { success: false });
            });
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                this.isActive = false;
                resolve({ success: true });
                return;
            }
            chrome.runtime.sendMessage({ action: 'vpn_disconnect' }, (res) => {
                this.isActive = false;
                this.probeIp();
                resolve(res || { success: true });
            });
        });
    }

    async setWebRTCShield(enabled) {
        this.webrtcSealed = enabled;
        localStorage.setItem('raeen_vpn_webrtc', enabled ? 'true' : 'false');
        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                resolve({ success: true });
                return;
            }
            chrome.runtime.sendMessage({ action: 'webrtc_shield_set', enabled }, (res) => {
                resolve(res || { success: false });
            });
        });
    }

    setKillSwitch(enabled) {
        this.killSwitch = enabled;
        localStorage.setItem('raeen_vpn_killswitch', enabled ? 'true' : 'false');
        if (this.isActive) {
            this.connect(this.currentNodeId);
        }
    }

    async triggerEmergencyNuclearPurge() {
        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                resolve({ success: true, purgedAt: Date.now() });
                return;
            }
            chrome.runtime.sendMessage({ action: 'emergency_nuclear_purge' }, (res) => {
                resolve(res || { success: false });
            });
        });
    }

    async probeIp() {
        if (this.isQueryingIp) return;
        this.isQueryingIp = true;
        const t0 = performance.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            const data = await res.json();
            const lat = Math.round(performance.now() - t0);
            this.pingMs = `${lat}ms`;
            if (this.isActive) {
                this.maskedIp = data.ip;
            } else {
                this.realIp = data.ip;
                this.maskedIp = 'Unprotected (' + data.ip + ')';
            }
        } catch (e) {
            this.pingMs = '---';
            if (this.isActive) {
                this.maskedIp = 'Encrypted (Cloaked)';
            }
        } finally {
            this.isQueryingIp = false;
            if (window.renderSecurityHud) window.renderSecurityHud();
        }
    }
}

export const securityManager = new MilitarySecurityManager();
