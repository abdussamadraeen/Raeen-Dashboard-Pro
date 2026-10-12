import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecurityManager, VPN_NODES, SECURE_DNS_PROVIDERS } from '../../entrypoints/newtab/js/vpn';

describe('VPN and SecurityManager module', () => {
  let securityManager;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    global.chrome = {
      proxy: {
        settings: {
          get: vi.fn((_opts, cb) => cb({ levelOfControl: 'controlled_by_this_extension' })),
          set: vi.fn((_cfg, cb) => cb && cb()),
          clear: vi.fn((_scope, cb) => cb && cb()),
        },
      },
      privacy: {
        network: {
          webRTCIPHandlingPolicy: {
            set: vi.fn((_val, cb) => cb && cb()),
            clear: vi.fn((_scope, cb) => cb && cb()),
          },
        },
      },
      runtime: {
        sendMessage: vi.fn((_msg, cb) => cb && cb({ success: true })),
        lastError: null,
      },
    };

    securityManager = new SecurityManager();
  });

  afterEach(() => {
    if (securityManager._watchdogInterval) clearInterval(securityManager._watchdogInterval);
    if (securityManager._timerInterval) clearInterval(securityManager._timerInterval);
  });

  it('defaults to tor_auto as initial node', () => {
    expect(securityManager.currentNodeId).toBe('tor_auto');
    expect(securityManager.currentNode.id).toBe('tor_auto');
    expect(securityManager.currentNode.scheme).toBe('socks5');
    expect(securityManager.currentNode.isTor).toBe(true);
  });

  it('has comprehensive tactical VPN nodes defined', () => {
    expect(VPN_NODES.length).toBeGreaterThan(5);
    const shieldNode = VPN_NODES.find(n => n.id === 'shield_direct');
    expect(shieldNode).toBeDefined();
    expect(shieldNode.scheme).toBe('direct');
  });

  it('builds direct PAC script for shield_direct node', () => {
    const pac = securityManager.buildPacScript({ id: 'shield_direct', scheme: 'direct' });
    expect(pac).toContain('return "DIRECT"');
  });

  it('builds failover PAC script for proxy node', () => {
    const pac = securityManager.buildPacScript({
      id: 'tor_auto',
      host: '127.0.0.1',
      port: 9050,
      scheme: 'socks5',
      isTor: true,
      fallbacks: [{ host: '127.0.0.1', port: 9150, scheme: 'socks5' }],
    });
    expect(pac).toContain('SOCKS5 127.0.0.1:9050');
    expect(pac).toContain('SOCKS5 127.0.0.1:9150');
    expect(pac).toContain('DIRECT');
  });

  it('seamlessly connects to In-Browser Privacy Shield without requiring Tor daemon', async () => {
    const res = await securityManager.connect('shield_direct');
    expect(res.success).toBe(true);
    expect(securityManager.isActive).toBe(true);
    expect(securityManager.currentNodeId).toBe('shield_direct');
    expect(securityManager.activeNodeConfig?.id).toBe('shield_direct');
    expect(localStorage.getItem('vpn_active')).toBe('true');
  });

  it('handles offline Tor daemon gracefully without losing user selection', async () => {
    // Mock fetch to simulate port 9052 being offline (clean store install)
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused: port 9052'));

    const res = await securityManager.connect('tor_auto');
    expect(res.success).toBe(true);
    expect(securityManager.isActive).toBe(true);
    expect(securityManager.currentNodeId).toBe('tor_auto');
    expect(securityManager.torOffline).toBe(true);
  });

  it('autoRecoverToDirect maintains active protection under Privacy Shield', async () => {
    securityManager.isActive = true;
    securityManager.currentNodeId = 'tor_auto';
    await securityManager.autoRecoverToDirect();

    expect(securityManager.isActive).toBe(true);
    expect(securityManager.torOffline).toBe(true);
    expect(securityManager.currentNodeId).toBe('tor_auto');
  });

  it('connects to United States cloud route with multi-endpoint failover and no local daemon requirement', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused: port 9052'));
    const res = await securityManager.connect('tor_us');
    expect(res.success).toBe(true);
    expect(securityManager.isActive).toBe(true);
    expect(securityManager.currentNodeId).toBe('tor_us');
    expect(securityManager.activeNodeConfig?.id).toBe('tor_us');
    expect(securityManager.activeNodeConfig?.host).toBe('107.174.30.94');
    expect(securityManager.activeNodeConfig?.fallbacks.length).toBeGreaterThan(0);
    expect(localStorage.getItem('vpn_active')).toBe('true');
  });

  it('supports node aliases like us_secure, europe_secure, asia_apac', () => {
    securityManager.currentNodeId = 'us_secure';
    expect(securityManager.currentNode.id).toBe('tor_us');
    securityManager.currentNodeId = 'europe_secure';
    expect(securityManager.currentNode.id).toBe('tor_de');
    securityManager.currentNodeId = 'asia_apac';
    expect(securityManager.currentNode.id).toBe('tor_sg');
  });

  it('disconnect cleanly turns off VPN and clears proxy settings', async () => {
    securityManager.isActive = true;
    const res = await securityManager.disconnect();

    expect(res.success).toBe(true);
    expect(securityManager.isActive).toBe(false);
    expect(securityManager.activeNodeConfig).toBeNull();
    expect(localStorage.getItem('vpn_active')).toBe('false');
    expect(chrome.proxy.settings.clear).toHaveBeenCalled();
  });
});
