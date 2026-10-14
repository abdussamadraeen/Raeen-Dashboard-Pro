import { StorageManager } from './storage.js';
import { state, defaultSettings, updateSettings, saveSettings } from './state.js';
import { dom } from './dom.js';
import { 
    applySettings, 
    syncSettingsUI, 
    updateTime, 
    loadBingGallery, 
    loadBraveGallery,
    updateCards, 
    syncBackgroundOptions, 
    renderThemeLibrary,
    renderDashboardChooser,
    applyDashboardPreset,
    DASHBOARD_PRESETS
} from './ui.js';
import { CanvasEngine } from './canvas.js';
import { 
    renderNotesList, 
    openNoteEditor, 
    closeNoteEditor, 
    deleteCurrentNote, 
    saveCurrentNote, 
    updateCharCount 
} from './notes.js';
import { renderShortcuts, addShortcut } from './shortcuts.js';
import { setupSearch, updateSearchEngineUI } from './search.js';
import { initFocusTimer } from './focus.js';
import { validateAndRepairSettings } from './schema.js';
import { escapeHTML, escapeAttribute, sanitizeURL } from './security.js';
import { securityManager, TACTICAL_NODES, SECURE_DNS_PROVIDERS } from './vpn.js';
import { GlobalStudioEngine } from './studio-engine.js';
import { Spotlight } from './spotlight.js';
import { AmbientAudio } from './ambient-audio.js';
import { GlobalCommandBus } from '../../../lib/agentCommandBus';

(async function init() {
    // 0. Remove pre-boot critical styles as dynamic DOM runtime takes over
    const preBootEl = document.getElementById('pre-boot-critical-css');
    if (preBootEl) preBootEl.remove();

    // 0. Synchronously hydrate critical state from localStorage cache to prevent reload flash
    try {
        const cachedMode = localStorage.getItem('app_dashboard_mode') || localStorage.getItem('raeen_dashboard_mode');
        if (cachedMode) state.settings.dashboardMode = cachedMode;
        const cachedBgType = localStorage.getItem('app_bg_type') || localStorage.getItem('raeen_bg_type');
        if (cachedBgType) state.settings.backgroundType = cachedBgType;
        const cachedBgVal = localStorage.getItem('app_bg_value') || localStorage.getItem('raeen_bg_value');
        if (cachedBgVal) state.settings.backgroundValue = cachedBgVal;
        const cachedTheme = localStorage.getItem('app_theme') || localStorage.getItem('raeen_theme');
        if (cachedTheme) state.settings.themePreference = cachedTheme;
    } catch(e) {
        console.warn('Failed to restore initial cache state', e);
    }

    // 1. Immediate UI Load
    applySettings();
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-transitions');
        });
    });
    // Battery-Saving Clock Scheduler: minute-boundary synchronization + Page Visibility pause
    let clockTimer = null;
    const scheduleClockUpdate = () => {
        if (clockTimer) {
            clearTimeout(clockTimer);
            clockTimer = null;
        }
        updateTime();
        if (document.hidden) return; // Tab in background: 0 timer wakeups, saves CPU & battery
        const now = new Date();
        const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
        clockTimer = setTimeout(scheduleClockUpdate, Math.max(100, msUntilNextMinute));
    };
    scheduleClockUpdate();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (clockTimer) {
                clearTimeout(clockTimer);
                clockTimer = null;
            }
        } else {
            scheduleClockUpdate();
        }
    });

    // Initialize category directories synchronously so window.renderDirectoriesWidget is ready
    initCategoryDirectories();

    // 2. Load Persisted State
    const loadStorage = async () => {
        try {
            await StorageManager.init();
            if (!StorageManager.isReady()) {
                console.warn("Storage not ready, retrying in 2s...");
                setTimeout(loadStorage, 2000);
                return;
            }

            let saved = await StorageManager.get('settings', 'main');
            if (saved) {
                saved = validateAndRepairSettings(saved);
                
                // Fix for google/bing dashboard url migration
                if ((saved.backgroundType === 'google_dashboard' || saved.backgroundType === 'bing_dashboard') && 
                    saved.backgroundValue && saved.backgroundValue.includes('/search')) {
                    saved.backgroundValue = saved.backgroundType === 'google_dashboard'
                        ? "https://www.google.com/?raeen_dashboard=true"
                        : "https://www.bing.com/?raeen_dashboard=true";
                    await saveSettings(saved);
                }

                // Ensure live dashboard modes match their backgroundType without destructive overwrites
                if (saved.backgroundType === 'google_dashboard' && saved.dashboardMode !== 'google_live') {
                    saved.dashboardMode = 'google_live';
                    await saveSettings(saved);
                } else if (saved.backgroundType === 'bing_dashboard' && saved.dashboardMode !== 'bing_live') {
                    saved.dashboardMode = 'bing_live';
                    await saveSettings(saved);
                }

                updateSettings(saved);
                if (saved.backgroundType) {
                    localStorage.setItem('app_bg_type', saved.backgroundType);
                    localStorage.setItem('raeen_bg_type', saved.backgroundType);
                    localStorage.setItem('app_bg_value', saved.backgroundValue || '');
                    localStorage.setItem('raeen_bg_value', saved.backgroundValue || '');
                }
                if (saved.dashboardMode) {
                    localStorage.setItem('app_dashboard_mode', saved.dashboardMode);
                    localStorage.setItem('raeen_dashboard_mode', saved.dashboardMode);
                }
                applySettings();
                updateTime();
            } else {
                const local = localStorage.getItem('raeen_dashboard_settings');
                if (local) {
                    try {
                        let parsed = JSON.parse(local);
                        parsed = validateAndRepairSettings(parsed);
                        updateSettings(parsed);
                        await saveSettings(state.settings);
                        localStorage.removeItem('raeen_dashboard_settings');
                        applySettings();
                    } catch (e) {
                        console.error("Error parsing settings from localStorage", e);
                    }
                } else {
                    await saveSettings(state.settings);
                }
            }
            
            // Re-render components once storage is ready
            renderNotesList();
            renderShortcuts();
            updateCards();
            updateSearchEngineUI();
            if (typeof window.renderDirectoriesWidget === 'function') {
                window.renderDirectoriesWidget();
            }
            if (typeof window.applyWidgetLayout === 'function') {
                window.applyWidgetLayout();
            }

            // Lazy render theme library in idle frame
            if (window.requestIdleCallback) {
                requestIdleCallback(() => renderThemeLibrary());
            } else {
                setTimeout(renderThemeLibrary, 150);
            }
        } catch (e) {
            console.error("Storage initialization failed", e);
        }
    };

    // 3. Feature setup (instant zero-latency execution for core newtab widgets)
    setupSearch();
    initFocusTimer();
    initSecurityHud();
    if (typeof window.renderDirectoriesWidget === 'function') {
        window.renderDirectoriesWidget();
    }
    Spotlight.init();
    initAmbientAudioUI();
    initCreativeStudioModalUI();

    // High-Efficiency Just-In-Time (JIT) Dynamic Loaders
    // Keeps newtab initial payload sub-16ms and memory minimal even across hundreds of tabs
    let fileShareLoaded = false;
    const ensureFileShareLoaded = async () => {
        if (fileShareLoaded) return;
        fileShareLoaded = true;
        try {
            const { initFileShare } = await import('./fileshare.js');
            initFileShare();
        } catch (err) {
            console.error('FileShare JIT initialization failed:', err);
        }
    };
    window.ensureFileShareLoaded = ensureFileShareLoaded;

    let imageCompressorLoaded = false;
    const ensureImageCompressorLoaded = async () => {
        if (imageCompressorLoaded) return;
        imageCompressorLoaded = true;
        try {
            const { initImageCompressor } = await import('./image-compressor.js');
            initImageCompressor();
        } catch (err) {
            console.error('ImageCompressor JIT initialization failed:', err);
        }
    };
    window.ensureImageCompressorLoaded = ensureImageCompressorLoaded;

    let pdfToolsLoaded = false;
    const ensurePdfToolsLoaded = async () => {
        if (pdfToolsLoaded) return;
        pdfToolsLoaded = true;
        try {
            const { initPdfTools } = await import('./pdf-tools.js');
            initPdfTools();
        } catch (err) {
            console.error('PDF Tools JIT initialization failed:', err);
        }
    };
    window.ensurePdfToolsLoaded = ensurePdfToolsLoaded;

    let studioLoaded = false;
    const ensureStudioLoaded = async () => {
        if (studioLoaded) return;
        studioLoaded = true;
        try {
            const [{ initDashboardStudio }, { initCreativeStudio }] = await Promise.all([
                import('./dashboard-studio.js'),
                import('./studio-ui.js'),
            ]);
            initDashboardStudio();
            initCreativeStudio();
        } catch (err) {
            console.error('Studio JIT initialization failed:', err);
        }
    };
    window.ensureStudioLoaded = ensureStudioLoaded;

    // Attach interaction triggers for on-demand instant activation
    const cardFileshare = document.getElementById('card-fileshare');
    if (cardFileshare) {
        ['pointerdown', 'keydown', 'dragenter'].forEach(evt => {
            cardFileshare.addEventListener(evt, () => ensureFileShareLoaded(), { once: true, passive: true });
        });
    }

    const cardPdf = document.getElementById('card-pdf-tools');
    if (cardPdf) {
        ['pointerdown', 'keydown', 'dragenter'].forEach(evt => {
            cardPdf.addEventListener(evt, () => ensurePdfToolsLoaded(), { once: true, passive: true });
        });
    }

    const cardImg = document.getElementById('card-image-compressor');
    if (cardImg) {
        ['pointerdown', 'keydown', 'dragenter'].forEach(evt => {
            cardImg.addEventListener(evt, () => ensureImageCompressorLoaded(), { once: true, passive: true });
        });
    }

    // Defer modules to idle frames only when active and tab is visible
    const runWhenIdle = (cb) => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(cb, { timeout: 2000 });
        } else {
            setTimeout(cb, 100);
        }
    };

    runWhenIdle(() => {
        if (!document.hidden && state.settings.showCardFileShare !== false) {
            ensureFileShareLoaded();
        }
        if (!document.hidden && state.settings.showCardPdfTools === true) {
            ensurePdfToolsLoaded();
        }
        if (!document.hidden && state.settings.showCardImageCompressor === true) {
            ensureImageCompressorLoaded();
        }
    });

    function initSecurityHud() {
        if (!dom.cardSecurityEl) return;

        window.renderSecurityHud = () => {
            const isEngaged = securityManager.isActive;
            const currentNode = TACTICAL_NODES.find(n => n.id === securityManager.currentNodeId) || TACTICAL_NODES[0];

            dom.cardSecurityEl.classList.toggle('hud-engaged', isEngaged);
            const radar = document.getElementById('hud-radar-scope');
            if (radar) radar.classList.toggle('radar-active', isEngaged);

            if (dom.hudDefconBadge) {
                dom.hudDefconBadge.textContent = isEngaged ? 'Protected' : 'Off';
                dom.hudDefconBadge.className = 'defcon-badge ' + (isEngaged ? 'defcon-hot' : 'defcon-idle');
            }

            if (dom.hudShieldStatus) {
                const isTorActive = isEngaged && (securityManager.telemetry.isTor || (currentNode.isTor && securityManager.daemonOnline));
                if (isTorActive) {
                    const countryLabel = securityManager.telemetry.country ? ` (${securityManager.telemetry.country})` : (currentNode.country ? ` (${currentNode.country})` : '');
                    dom.hudShieldStatus.textContent = `🧅 Tor Active${countryLabel}`;
                    dom.hudShieldStatus.style.color = '#10b981';
                } else if (isEngaged && securityManager.torOffline) {
                    dom.hudShieldStatus.textContent = 'Stealth Protected';
                    dom.hudShieldStatus.style.color = '#10b981';
                } else {
                    dom.hudShieldStatus.textContent = isEngaged ? 'Connected' : 'Ready';
                    dom.hudShieldStatus.style.color = isEngaged ? '#10b981' : '#38bdf8';
                }
            }

            if (dom.hudCipherVal) {
                dom.hudCipherVal.textContent = isEngaged ? (currentNode.cipher || 'AES-256 Shield') : '256-Bit Shield';
            }

            if (dom.hudWebrtcStatus) {
                dom.hudWebrtcStatus.textContent = securityManager.webrtcSealed ? 'Active' : 'Off';
                dom.hudWebrtcStatus.style.color = securityManager.webrtcSealed ? '#10b981' : '#ef4444';
            }

            if (dom.hudIpVal) {
                dom.hudIpVal.textContent = isEngaged ? securityManager.maskedIp : securityManager.realIp;
            }

            if (dom.hudPingVal) {
                dom.hudPingVal.textContent = securityManager.pingMs;
            }

            if (dom.hudVerifyLink) {
                const isTorVerified = isEngaged && (securityManager.telemetry.isTor || (currentNode.isTor && !securityManager.torOffline));
                dom.hudVerifyLink.href = isTorVerified ? 'https://check.torproject.org' : 'https://browserleaks.com/ip';
                dom.hudVerifyLink.title = isTorVerified ? 'Verify Tor Onion routing on check.torproject.org' : 'Verify IP and leak protection on BrowserLeaks';
            }

            if (dom.hudToggleBtnText) {
                dom.hudToggleBtnText.textContent = isEngaged ? 'Disconnect' : 'Connect VPN';
            }

            if (dom.hudToggleShieldBtn) {
                dom.hudToggleShieldBtn.classList.toggle('btn-active', isEngaged);
            }

            if (dom.hudNodeSelect) {
                if (!dom.hudNodeSelect._populated) {
                    dom.hudNodeSelect._populated = true;
                    dom.hudNodeSelect.innerHTML = TACTICAL_NODES.map(node => `
                        <option value="${node.id}">${node.name}</option>
                    `).join('');
                }
                dom.hudNodeSelect.value = securityManager.currentNodeId || 'tor_auto';
            }

            if (dom.hudCustomFields) {
                dom.hudCustomFields.classList.toggle('hidden', securityManager.currentNodeId !== 'custom');
            }

            if (dom.hudNodeHint) {
                if (currentNode.scheme === 'direct') {
                    dom.hudNodeHint.innerHTML = `🛡️ <strong>In-Browser Privacy Shield:</strong> Instant zero-setup protection. Seals WebRTC hardware IP leaks and encrypts DNS lookups directly in Chrome.`;
                } else if (currentNode.isTor || currentNode.id === 'tor_auto') {
                    if (securityManager.torOffline && !securityManager.isActive) {
                        dom.hudNodeHint.innerHTML = `🧅 <strong>${currentNode.name}:</strong> Multi-Hop Tor Relay. (Runs automatically via Auto-Launcher or Tor Browser).`;
                    } else if (securityManager.torOffline && securityManager.isActive) {
                        dom.hudNodeHint.innerHTML = `🛡️ <strong>Cloud Privacy Route Active:</strong> IP masked and DNS sealed. Start <code>enable-autostart.bat</code> for local Onion daemons.`;
                    } else {
                        dom.hudNodeHint.innerHTML = `🧅 <strong>${currentNode.name}:</strong> Multi-Hop Onion Route Active • Exit: ${currentNode.countryCode ? currentNode.countryCode.toUpperCase() : 'AUTO'}`;
                    }
                } else if (currentNode.id === 'custom') {
                    dom.hudNodeHint.innerHTML = '⚙️ <strong>Custom Proxy:</strong> Connects to your private SOCKS5 or HTTPS proxy.';
                } else {
                    dom.hudNodeHint.innerHTML = `🌐 <strong>${currentNode.name}:</strong> High-Speed Cloud Tunnel (Zero Setup) • Exit: ${currentNode.country || 'Protected'}`;
                }
            }

            if (dom.hudDnsStatusBadge) {
                const isSecured = securityManager.webrtcSealed;
                dom.hudDnsStatusBadge.textContent = isSecured ? 'Protected' : 'Standard';
                dom.hudDnsStatusBadge.className = 'defcon-badge ' + (isSecured ? 'defcon-hot' : 'defcon-idle');
            }

            if (dom.hudWebrtcToggle) {
                dom.hudWebrtcToggle.checked = securityManager.webrtcSealed !== false;
            }

            if (dom.hudKillswitchToggle) {
                dom.hudKillswitchToggle.checked = securityManager.killSwitch === true;
            }

            if (dom.hudDnsSelect) {
                dom.hudDnsSelect.value = securityManager.activeDnsId || 'cloudflare';
            }

            if (dom.hudDnsHint) {
                const curDns = SECURE_DNS_PROVIDERS.find(p => p.id === (securityManager.activeDnsId || 'cloudflare')) || SECURE_DNS_PROVIDERS[0];
                dom.hudDnsHint.innerHTML = `${curDns.icon || '🛡️'} <strong>${curDns.name}:</strong> ${curDns.features || 'Encrypted DNS-over-HTTPS.'}`;
            }

            // Tor Engine Live Status Pill
            if (dom.hudEngineText && dom.hudEngineDot) {
                if (securityManager.daemonOnline) {
                    dom.hudEngineDot.style.background = '#10b981';
                    const activeCc = securityManager.activeNodeConfig?.countryCode && securityManager.activeNodeConfig.countryCode !== 'direct' ? securityManager.activeNodeConfig.countryCode.toUpperCase() : 'AUTO';
                    dom.hudEngineText.textContent = `🟢 Tor Engine: Online (${activeCc})`;
                    dom.hudEngineText.style.color = '#34d399';
                    if (dom.hudEngineAction) {
                        dom.hudEngineAction.textContent = 'Rotate IP ↻';
                        dom.hudEngineAction.style.color = '#38bdf8';
                        dom.hudEngineAction.onclick = async (e) => {
                            e.stopPropagation();
                            dom.hudEngineAction.textContent = 'Rotating...';
                            await fetch('http://127.0.0.1:9052/rotate').catch(() => {});
                            setTimeout(() => {
                                securityManager.probeRealIp(true);
                                window.renderSecurityHud();
                            }, 1200);
                        };
                    }
                } else {
                    const isTorRoute = (securityManager.currentNode?.isTor || securityManager.currentNodeId === 'tor_auto');
                    if (isTorRoute) {
                        dom.hudEngineDot.style.background = '#f59e0b';
                        dom.hudEngineText.textContent = '🧅 Tor Engine: Offline (Auto-Shield Active)';
                        dom.hudEngineText.style.color = '#fbbf24';
                        if (dom.hudEngineAction) {
                            dom.hudEngineAction.textContent = 'Switch On ⚡';
                            dom.hudEngineAction.style.color = '#fbbf24';
                            dom.hudEngineAction.onclick = async (e) => {
                                e.stopPropagation();
                                dom.hudEngineAction.textContent = 'Starting...';
                                const res = await securityManager.triggerNativeLauncher().catch(() => ({ success: false }));
                                if (res && res.success) {
                                    await new Promise(r => setTimeout(r, 1500));
                                    await securityManager.checkBridgeHealth();
                                    window.renderSecurityHud();
                                } else {
                                    alert("⚡ Tor Auto-Launcher Setup:\n\n1. One-Click Native Auto-Launch:\nDouble-click 'tools/register-native-launcher.bat' once. This enables Chrome to start Tor automatically whenever you click Switch On!\n\n2. Silent Auto-Start on Boot:\nDouble-click 'tools/enable-autostart.bat' to run Tor silently in the background whenever Windows starts.\n\n3. Zero Setup Cloud Tunnels:\nSelect United States, Germany, UK, or Singapore in the route selector to connect instantly with zero local scripts!");
                                    window.renderSecurityHud();
                                }
                            };
                        }
                    } else {
                        dom.hudEngineDot.style.background = '#10b981';
                        dom.hudEngineText.textContent = '🌐 High-Speed Route: Ready (Zero Setup)';
                        dom.hudEngineText.style.color = '#34d399';
                        if (dom.hudEngineAction) {
                            dom.hudEngineAction.textContent = 'Zero Setup';
                            dom.hudEngineAction.style.color = '#38bdf8';
                            dom.hudEngineAction.onclick = null;
                        }
                    }
                }
            }

            // Quick Status Indicator
            const quickDot = document.getElementById('hud-quick-dot');
            const quickText = document.getElementById('hud-quick-text');
            if (quickText && quickDot) {
                if (isEngaged) {
                    quickDot.className = 'hud-quick-dot dot-active';
                    if (currentNode.scheme === 'direct') {
                        quickText.textContent = 'Privacy Shield Active: WebRTC sealed & safe browsing enabled';
                    } else if (currentNode.isTor) {
                        if (securityManager.torOffline) {
                            quickText.textContent = 'Privacy Shield Active: WebRTC sealed & browsing protected';
                        } else {
                            quickText.textContent = 'Tor Route Active: Real IP masked through onion circuit';
                        }
                    } else {
                        quickText.textContent = `Encrypted Route Active: IP masked via ${currentNode.name}`;
                    }
                } else {
                    quickDot.className = 'hud-quick-dot dot-idle';
                    quickText.textContent = 'Protection Ready: Click Connect to shield your browsing';
                }
            }
        };

        if (dom.hudNodeSelect) {
            dom.hudNodeSelect.onchange = async (e) => {
                const nodeId = e.target.value;
                securityManager.currentNodeId = nodeId;
                if (dom.hudCustomFields) {
                    dom.hudCustomFields.classList.toggle('hidden', nodeId !== 'custom');
                }

                // If user selects Tor Onion route and Tor engine is offline, proactively trigger native launcher
                if (nodeId === 'tor_auto' && !securityManager.daemonOnline) {
                    securityManager.triggerNativeLauncher().then(async (res) => {
                        if (res && res.success) {
                            await new Promise(r => setTimeout(r, 1500));
                            await securityManager.checkBridgeHealth();
                            window.renderSecurityHud();
                        }
                    }).catch(() => {});
                }

                if (securityManager.isActive) {
                    await securityManager.connect(nodeId);
                }
                window.renderSecurityHud();
            };
        }

        if (dom.hudCustomHost && dom.hudCustomPort) {
            const saveCustom = () => {
                securityManager.customProxy = {
                    scheme: 'socks5',
                    host: dom.hudCustomHost.value.trim(),
                    port: dom.hudCustomPort.value.trim()
                };
                localStorage.setItem('raeen_vpn_custom', JSON.stringify(securityManager.customProxy));
            };
            dom.hudCustomHost.oninput = saveCustom;
            dom.hudCustomPort.oninput = saveCustom;
            if (securityManager.customProxy) {
                dom.hudCustomHost.value = securityManager.customProxy.host || '';
                dom.hudCustomPort.value = securityManager.customProxy.port || '';
            }
        }

        if (dom.hudToggleShieldBtn) {
            dom.hudToggleShieldBtn.onclick = async () => {
                dom.hudToggleShieldBtn.disabled = true;
                if (dom.hudToggleBtnText) {
                    dom.hudToggleBtnText.textContent = securityManager.isActive ? 'Disconnecting...' : 'Connecting...';
                }
                try {
                    if (securityManager.isActive) {
                        await securityManager.disconnect();
                    } else {
                        await securityManager.connect();
                    }
                } finally {
                    dom.hudToggleShieldBtn.disabled = false;
                    window.renderSecurityHud();
                }
            };
        }

        if (dom.hudNuclearScramBtn) {
            dom.hudNuclearScramBtn.onclick = async () => {
                const confirmed = confirm("🧹 Clear All Browsing Traces?\n\nThis will remove website cookies, temporary cache, and history to leave zero trace on this device.\n\nYour dashboard settings and saved notes are kept safe.");
                if (!confirmed) return;

                dom.hudNuclearScramBtn.disabled = true;
                const originalContent = dom.hudNuclearScramBtn.innerHTML;
                dom.hudNuclearScramBtn.innerHTML = '<span>Cleaning...</span>';

                try {
                    await securityManager.triggerClearTraces();
                    alert("✓ Browsing traces cleared successfully.");
                } catch (err) {
                    alert("Failed to clear traces: " + (err?.message || err));
                } finally {
                    dom.hudNuclearScramBtn.disabled = false;
                    dom.hudNuclearScramBtn.innerHTML = originalContent;
                }
            };
        }

        // Wire DNS Shield interactions
        if (dom.hudDnsSelect) {
            dom.hudDnsSelect.value = securityManager.activeDnsId || 'cloudflare';
            dom.hudDnsSelect.onchange = (e) => {
                const dnsId = e.target.value;
                securityManager.setDns(dnsId);
                const provider = SECURE_DNS_PROVIDERS.find(p => p.id === dnsId) || SECURE_DNS_PROVIDERS[0];
                if (dom.hudDnsHint) {
                    dom.hudDnsHint.innerHTML = `${provider.icon || '🛡️'} <strong>${provider.name}:</strong> ${provider.features || 'Encrypted DNS-over-HTTPS.'}`;
                }
                if (dom.hudDnsEncStatus) {
                    dom.hudDnsEncStatus.textContent = 'DoH Active';
                }
            };
        }

        if (dom.hudWebrtcToggle) {
            dom.hudWebrtcToggle.checked = securityManager.webrtcSealed !== false;
            dom.hudWebrtcToggle.onchange = async (e) => {
                await securityManager.setWebRTCShield(e.target.checked);
                window.renderSecurityHud();
            };
        }

        if (dom.hudKillswitchToggle) {
            dom.hudKillswitchToggle.checked = securityManager.killSwitch === true;
            dom.hudKillswitchToggle.onchange = async (e) => {
                await securityManager.toggleKillSwitch(e.target.checked);
                window.renderSecurityHud();
            };
        }

        if (dom.hudDnsTestBtn) {
            dom.hudDnsTestBtn.onclick = async () => {
                dom.hudDnsTestBtn.disabled = true;
                const originalText = dom.hudDnsTestBtn.textContent;
                dom.hudDnsTestBtn.textContent = 'Testing...';
                if (dom.hudDnsLatency) dom.hudDnsLatency.textContent = 'Measuring...';

                try {
                    const res = await securityManager.testDnsResolution();
                    if (res && res.success && dom.hudDnsLatency) {
                        dom.hudDnsLatency.textContent = `${res.latencyMs} (Fast)`;
                        dom.hudDnsLatency.style.color = '#10b981';
                        if (dom.hudDnsEncStatus) {
                            dom.hudDnsEncStatus.textContent = res.webrtcLeaking ? 'IP Leak Detected!' : 'Encrypted • 0 Leaks';
                            dom.hudDnsEncStatus.style.color = res.webrtcLeaking ? '#ef4444' : '#10b981';
                        }
                        if (dom.hudDnsHint) {
                            dom.hudDnsHint.innerHTML = res.webrtcLeaking 
                                ? `⚠️ <strong>Leak Warning:</strong> Browser IP leak detected. Enable Browser IP Leak Guard above.`
                                : `✓ <strong>Verified Protected:</strong> ${res.latencyMs} response time. Zero IP or DNS leaks detected.`;
                        }
                    } else if (dom.hudDnsLatency) {
                        dom.hudDnsLatency.textContent = 'Timeout';
                        dom.hudDnsLatency.style.color = '#ef4444';
                    }
                } catch(err) {
                    if (dom.hudDnsLatency) dom.hudDnsLatency.textContent = 'Error';
                } finally {
                    dom.hudDnsTestBtn.disabled = false;
                    dom.hudDnsTestBtn.textContent = originalText;
                }
            };
        }

        securityManager.init().then(() => {
            window.renderSecurityHud();
        });
    }

    // Start background storage hydration without blocking immediate UI interactivity
    loadStorage();

    // Event Listeners
    if (dom.saveCustomDashboardBtn) {
        dom.saveCustomDashboardBtn.onclick = async () => {
            state.settings.dashboardMode = 'custom';
            if (typeof window.saveWidgetLayout === 'function') {
                window.saveWidgetLayout();
            }
            const name = prompt('Name this custom dashboard profile:', `Custom Layout ${(state.settings.customDashboards?.length || 0) + 1}`);
            if (name && name.trim()) {
                const { createDashboardSnapshot } = await import('./dashboard-studio.js');
                const snapshot = await createDashboardSnapshot(name.trim());
                if (!Array.isArray(state.settings.customDashboards)) {
                    state.settings.customDashboards = [];
                }
                state.settings.customDashboards.push(snapshot);
                state.settings.activeCustomDashboardId = snapshot.id;
            }
            await commitSettings();
            syncSettingsUI();
            alert('✓ Your custom dashboard layout is saved and kept as your default.');
        };
    }

    if (dom.resetDashboardLayoutBtn) {
        dom.resetDashboardLayoutBtn.onclick = () => {
            const confirmed = confirm("Reset all widget positions and sizes to the default balanced layout?");
            if (!confirmed) return;
            localStorage.removeItem("raeen_widget_positions");
            localStorage.removeItem("raeen_widget_sizes");
            document.querySelectorAll(".draggable-widget").forEach(widget => {
                widget.style.left = "";
                widget.style.top = "";
                widget.style.width = "";
                widget.style.height = "";
            });
            if (typeof window.applyWidgetLayout === 'function') {
                window.applyWidgetLayout();
            }
            applyDashboardPreset('pro');
            alert('✓ Layout reset to default balanced 3-column arrangement.');
        };
    }

    if (dom.settingsBtn) {
        dom.settingsBtn.onclick = () => {
            renderThemeLibrary();
            syncSettingsUI();
            dom.modalOverlay.classList.toggle('hidden');
        };
    }
    if (dom.closeBtn) dom.closeBtn.onclick = () => dom.modalOverlay.classList.add('hidden');

    if (dom.liveSettingsBtn) {
        dom.liveSettingsBtn.onclick = (e) => {
            if (e) e.stopPropagation();
            renderThemeLibrary();
            syncSettingsUI();
            if (dom.modalOverlay) {
                dom.modalOverlay.classList.remove('hidden');
            }
        };
    }

    // Auto-open settings modal if requested via URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('settings') === 'true') {
        setTimeout(() => {
            if (dom.settingsBtn && dom.modalOverlay && dom.modalOverlay.classList.contains('hidden')) {
                dom.settingsBtn.click();
            }
        }, 150);
    }

    // Helper functions for settings sync
    let settingsSaveTimeout = null;

    const cancelPendingSettingsSave = () => {
        clearTimeout(settingsSaveTimeout);
        settingsSaveTimeout = null;
    };

    const commitSettings = (noApply = false) => {
        cancelPendingSettingsSave();
        return saveSettings(state.settings, noApply);
    };

    const saveSettingsSoon = (shouldApply = true) => {
        cancelPendingSettingsSave();
        if (shouldApply) applySettings();
        settingsSaveTimeout = setTimeout(() => {
            settingsSaveTimeout = null;
            saveSettings(state.settings, true);
        }, 180);
    };

    const flushPendingSettings = () => {
        if (settingsSaveTimeout === null) return;
        commitSettings(true);
    };

    const bindToggle = (el, key, cb) => {
        if (el) el.onchange = (e) => { 
            state.settings[key] = e.target.checked; 
            commitSettings();
            cb && cb(); 
        };
    };
    const bindVal = (el, key, ev = "oninput", cb) => {
        if (el) el[ev] = (e) => { 
            const value = e.target.value;
            state.settings[key] = value;
            cb && cb(value);

            if (ev === "oninput") {
                saveSettingsSoon();
            } else {
                commitSettings();
            }
        };
    };
    const bindRadio = (name, key, cb) => {
        document.getElementsByName(name).forEach((el) => {
            el.onchange = (e) => { 
                state.settings[key] = e.target.value; 
                commitSettings();
                cb && cb(); 
            };
        });
    };

    // Background Settings
    if (dom.bgTypeSelect) {
        dom.bgTypeSelect.onchange = (e) => {
            const val = e.target.value;
            const normalizedType = (val === 'curated' || val === 'brave') ? 'curated' : val;
            state.settings.backgroundType = normalizedType;
            if (normalizedType === 'bing') state.settings.backgroundValue = 'bing_latest_v2';
            if (normalizedType === 'curated') state.settings.backgroundValue = 'curated_random';
            if (normalizedType === 'google_dashboard') {
                state.settings.backgroundValue = 'https://www.google.com/?raeen_dashboard=true&app_dashboard=true';
                state.settings.dashboardMode = 'google_live';
            }
            if (normalizedType === 'bing_dashboard') {
                state.settings.backgroundValue = 'https://www.bing.com/?raeen_dashboard=true&app_dashboard=true';
                state.settings.dashboardMode = 'bing_live';
            }
            if (normalizedType !== 'google_dashboard' && normalizedType !== 'bing_dashboard') {
                if (state.settings.dashboardMode === 'google_live' || state.settings.dashboardMode === 'bing_live') {
                    state.settings.dashboardMode = 'pro';
                }
            }
            commitSettings();
            syncBackgroundOptions();
            if (normalizedType === 'bing') loadBingGallery();
            if (normalizedType === 'curated') loadBraveGallery();
        };
    }

    bindVal(dom.canvasStyleSelect, 'canvasStyle');
    if (dom.canvasSpeedSlider) {
        dom.canvasSpeedSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            state.settings.canvasSpeed = val;
            if (dom.canvasSpeedVal) dom.canvasSpeedVal.textContent = `${val.toFixed(1)}×`;
            CanvasEngine.setOptions({ speed: val });
            saveSettingsSoon();
        };
    }
    if (dom.canvasDensitySlider) {
        dom.canvasDensitySlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            state.settings.canvasDensity = val;
            if (dom.canvasDensityVal) dom.canvasDensityVal.textContent = `${Math.round(val * 100)}%`;
            CanvasEngine.setOptions({ density: val });
            saveSettingsSoon();
        };
    }
    if (dom.canvasGlowSlider) {
        dom.canvasGlowSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            state.settings.canvasGlow = val;
            if (dom.canvasGlowVal) dom.canvasGlowVal.textContent = `${Math.round(val * 100)}%`;
            CanvasEngine.setOptions({ glow: val });
            saveSettingsSoon();
        };
    }
    bindVal(dom.bgCustomUrl, 'backgroundValue', 'onchange');
    bindVal(dom.customSearchUrlInput, 'customSearchUrl', 'onchange');
    bindVal(dom.clockFormatSelect, 'clockFormat', 'oninput', () => { if (dom.timeEl) dom.timeEl._lastFormat = null; updateTime(); });
    bindToggle(dom.toggleClockAmPm, 'showClockAmPm', () => { if (dom.timeEl) dom.timeEl._lastFormat = null; updateTime(); });

    bindToggle(dom.showNoosphereToggle, 'showNoosphereBar');
    bindToggle(dom.showSettingsInImmersiveToggle, 'showSettingsButtonInImmersive');
    bindToggle(dom.showMainUIToggle, 'showMainUI');
    bindToggle(dom.toggleSearch, 'showSearch');
    bindToggle(dom.toggleTopSites, 'showTopSites', renderShortcuts);
    bindToggle(dom.toggleClock, 'showClock');
    bindToggle(dom.toggleCards, 'showCards');
    bindToggle(dom.toggleCardDate, 'showCardDate');
    bindToggle(dom.toggleCardFocus, 'showCardFocus');
    bindToggle(dom.toggleCardNote, 'showCardNote');
    bindToggle(dom.toggleCardSecurity, 'showCardSecurity');
    bindToggle(dom.toggleCardDns, 'showCardDns');
    bindToggle(dom.toggleCardFileShare, 'showCardFileShare');
    bindToggle(dom.toggleCardImageCompressor, 'showCardImageCompressor');
    bindToggle(dom.toggleCardPdfTools, 'showCardPdfTools');
    bindToggle(dom.toggleCardDirectories, 'showCardDirectories', () => {
        if (typeof window.renderDirectoriesWidget === 'function') window.renderDirectoriesWidget();
    });
    bindToggle(dom.toggleDragDrop, 'enableDragAndDrop');

    bindRadio('theme_preference', 'themePreference');
    bindRadio('search_engine', 'searchEngine', updateSearchEngineUI);
    bindRadio('topsites_source', 'topSitesSource', renderShortcuts);

function optimizeImage(file) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                return resolve(file);
            }
            if (file.type === 'image/gif') {
                return resolve(file);
            }

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const MAX_WIDTH = 2560;
                const MAX_HEIGHT = 1440;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    const widthRatio = MAX_WIDTH / width;
                    const heightRatio = MAX_HEIGHT / height;
                    const bestRatio = Math.min(widthRatio, heightRatio);
                    width = Math.round(width * bestRatio);
                    height = Math.round(height * bestRatio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const outputType = 'image/jpeg';
                canvas.toBlob((blob) => {
                    if (blob) {
                        const optimizedFile = new File([blob], file.name, { type: outputType });
                        resolve(optimizedFile);
                    } else {
                        resolve(file);
                    }
                }, outputType, 0.85);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            };

            img.src = objectUrl;
        });
    }

    if (dom.bgLocalFile) {
        dom.bgLocalFile.onchange = async e => {
            if (e.target.files && e.target.files[0]) {
                let file = e.target.files[0];
                if (file.type.startsWith('image/') && file.type !== 'image/gif') {
                    try {
                        file = await optimizeImage(file);
                    } catch (err) {
                        console.warn("Image optimization failed, saving original", err);
                    }
                }
                await StorageManager.set('mediaStore', 'localBackground', { data: file, type: file.type, timestamp: Date.now() });
                state.settings.backgroundValue = 'local_' + Date.now();
                state.settings.backgroundType = 'local';
                commitSettings();
            }
        };
    }

    // Palette category tabs filter
    document.querySelectorAll('.palette-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.palette-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            document.querySelectorAll('.color-swatch').forEach(swatch => {
                const type = swatch.dataset.type;
                if (filter === 'all') {
                    swatch.classList.remove('swatch-hidden');
                } else if (filter === 'gradients') {
                    swatch.classList.toggle('swatch-hidden', type !== 'gradient');
                } else if (filter === 'solids') {
                    swatch.classList.toggle('swatch-hidden', type !== 'solid');
                }
            });
        };
    });

    if (dom.bgColorPicker) {
        dom.bgColorPicker.oninput = () => {
            state.settings.backgroundType = 'solid';
            state.settings.backgroundValue = dom.bgColorPicker.value;
            if (dom.bgColorText) dom.bgColorText.value = dom.bgColorPicker.value;
            commitSettings();
            syncSettingsUI();
        };
    }

    if (dom.bgColorText) {
        dom.bgColorText.oninput = () => {
            const val = dom.bgColorText.value.trim();
            if (!val) return;
            state.settings.backgroundType = 'solid';
            state.settings.backgroundValue = val;
            if (dom.bgColorPicker && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) {
                dom.bgColorPicker.value = val;
            }
            commitSettings();
            syncSettingsUI();
        };
    }

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = () => {
            state.settings.backgroundType = 'solid';
            state.settings.backgroundValue = swatch.dataset.color;
            if (dom.bgColorText) dom.bgColorText.value = swatch.dataset.color;
            if (dom.bgColorPicker && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(swatch.dataset.color)) {
                dom.bgColorPicker.value = swatch.dataset.color;
            }
            commitSettings();
            syncSettingsUI();
        };
    });

    // Notes
    if (dom.addNoteBtn) dom.addNoteBtn.onclick = () => openNoteEditor();
    if (dom.noteBackBtn) dom.noteBackBtn.onclick = closeNoteEditor;
    if (dom.noteDeleteBtn) dom.noteDeleteBtn.onclick = deleteCurrentNote;

    // Shortcuts
    if (dom.addShortcutBtn) dom.addShortcutBtn.onclick = addShortcut;

    // Video sound
    if (dom.videoSoundBtn) {
        dom.videoSoundBtn.onclick = () => {
            const video = dom.bgLayer.querySelector('video');
            if (video) {
                state.settings.videoMuted = !state.settings.videoMuted;
                video.muted = state.settings.videoMuted;
                if (!state.settings.videoMuted) {
                    video.volume = 1.0;
                    video.play().catch(console.warn);
                }
                dom.videoSoundBtn.classList.toggle('muted', state.settings.videoMuted);
                const svg = dom.videoSoundBtn.querySelector('svg');
                if (svg) {
                    svg.innerHTML = state.settings.videoMuted ? 
                        '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.05-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l7.73 7.73H7v6h4l5 5v-6.73l4.25 4.25c.67-.64 1.24-1.37 1.7-2.18L5.73 3zM12 4L9.27 6.73 12 9.46V4z"/>' : 
                        '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
                }
                commitSettings(true);
            }
        };
    }

    // Auto save note
    let saveTimeout;
    const autoSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCurrentNote, 300);
    };
    if (dom.noteEditorTitle) dom.noteEditorTitle.oninput = autoSave;
    if (dom.noteEditorBody) dom.noteEditorBody.oninput = () => { autoSave(); updateCharCount(); };

    window.addEventListener('beforeunload', () => {
        flushPendingSettings();
        saveCurrentNote();
    });

    // Sidebar Tabs
    dom.sidebarTabs.forEach(tab => {
        tab.onclick = () => {
            dom.sidebarTabs.forEach(t => t.classList.remove('active'));
            dom.tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        };
    });

    if (dom.addAppBtn) dom.addAppBtn.onclick = () => dom.addAppModal.classList.remove('hidden');
    if (state.settings.backgroundType === 'bing') loadBingGallery();
    if (state.settings.backgroundType === 'brave') loadBraveGallery();

    // Dashboard Title Change
    const titleIn = document.getElementById('dashboard-title-input');
    if (titleIn) {
        titleIn.oninput = (e) => {
            state.settings.dashboardTitle = e.target.value;
            document.title = state.settings.dashboardTitle || 'New Tab';
            saveSettingsSoon(false);
        };
    }

    // Frame message listener (using postMessage to prevent tab cross-talk)
    window.addEventListener('message', async (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        const iframe = dom.bgLayer ? dom.bgLayer.querySelector('iframe') : null;

        if (msg.action === 'iframe_navigated' && msg.title) {
            if (iframe && event.source === iframe.contentWindow) {
                document.title = msg.title;
            }
            return;
        }

        if (msg.action === 'open_dashboard_settings') {
            renderThemeLibrary();
            syncSettingsUI();
            if (dom.modalOverlay) {
                dom.modalOverlay.classList.remove('hidden');
            }
            return;
        }

        if (msg.action === 'close_dashboard_iframe') {
            try {
                // 1. Immediately scrub all live-bg preloader classes and style overrides
                document.documentElement.classList.remove('live-bg-pre-active');
                document.body.classList.remove('live-bg-active');
                document.querySelectorAll('#app-preloader-style, #app-theme-preloader-style, #app-live-preloader-style, #raeen-preloader-style, #raeen-theme-preloader-style, #raeen-live-preloader-style, style[data-preloader]').forEach(el => el.remove());
                document.querySelectorAll('style').forEach(s => {
                    if (s.textContent && s.textContent.includes('.container') && s.textContent.includes('display: none !important')) {
                        s.remove();
                    }
                });

                // 2. Immediately tear down background iframe
                if (dom.bgLayer) {
                    const ifr = dom.bgLayer.querySelector('iframe');
                    if (ifr) {
                        ifr.src = 'about:blank';
                        ifr.remove();
                    }
                    dom.bgLayer.innerHTML = '';
                    dom.bgLayer.style.backgroundImage = 'none';
                }

                // 3. Restore last non-live background
                const targetBgType = state.settings.lastNonLiveBgType || 'brave';
                const targetBgVal = state.settings.lastNonLiveBgValue || 'brave_random';
                state.settings.backgroundType = targetBgType;
                state.settings.backgroundValue = targetBgVal;
                state.settings.dashboardMode = 'pro';
                localStorage.setItem('raeen_bg_type', targetBgType);
                localStorage.setItem('raeen_bg_value', targetBgVal);
                localStorage.setItem('raeen_dashboard_mode', 'pro');

                applySettings();
                syncSettingsUI();
                updateTime();

                // 4. Asynchronously persist to StorageManager
                let settings = await StorageManager.get('settings', 'main');
                if (!settings) {
                    settings = { ...state.settings };
                }
                settings.backgroundType = targetBgType;
                settings.backgroundValue = targetBgVal;
                settings.dashboardMode = 'pro';
                updateSettings(settings);
                await saveSettings(settings);
            } catch (err) {
                console.error("Failed to restore settings:", err);
            }
            return;
        }
    });

    // Backup & Restore
    const exportBtn = document.getElementById('export-settings-btn');
    const importInput = document.getElementById('import-settings-input');
    const importBtn = document.getElementById('import-settings-btn');

    if (importBtn && importInput) {
        importBtn.onclick = () => importInput.click();
    }

    if (exportBtn) {
        exportBtn.onclick = async () => {
            try {
                const settings = await StorageManager.get('settings', 'main');
                const notes = await StorageManager.getAll('notes');
                const backupData = { settings, notes };
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const aElement = document.createElement('a');
                aElement.href = url;
                aElement.download = 'raeen_dashboard_backup.json';
                aElement.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Failed to export backup", err);
                alert("Failed to export settings.");
            }
        };
    }

    if (importInput) {
        importInput.onchange = async (evt) => {
            const file = evt.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.settings) {
                        const validated = validateAndRepairSettings(data.settings);
                        await StorageManager.set('settings', 'main', validated);
                    }
                    if (data.notes && Array.isArray(data.notes)) {
                        for (const note of data.notes) {
                            await StorageManager.set('notes', note.id, note);
                        }
                    }
                    alert("Backup imported successfully! Reloading...");
                    location.reload();
                } catch (err) {
                    console.error("Import error", err);
                    alert("Failed to import settings. Invalid file format.");
                }
            };
            reader.readAsText(file);
        };
    }

    // Shortcuts key listeners
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            document.body.classList.toggle('boss-mode-active');
        }
        if (e.key === 'Escape') {
            ['settings-modal', 'add-site-modal', 'add-app-modal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            });
        }
    });

    // ─── Category Directories Self-Injected Feature ───
    function initCategoryDirectories() {
        const defaultDirectories = [
            {
                id: "preset-ai",
                name: "AI Hub",
                icon: "bot",
                visible: true,
                sites: [
                    { name: "ChatGPT", url: "https://chatgpt.com" },
                    { name: "Gemini", url: "https://gemini.google.com" },
                    { name: "Claude", url: "https://claude.ai" },
                    { name: "Perplexity", url: "https://perplexity.ai" }
                ]
            },
            {
                id: "preset-work",
                name: "Work & Docs",
                icon: "folder",
                visible: true,
                sites: [
                    { name: "Google", url: "https://google.com" },
                    { name: "Gmail", url: "https://mail.google.com" },
                    { name: "Google Drive", url: "https://drive.google.com" },
                    { name: "Office", url: "https://www.office.com" },
                    { name: "Outlook", url: "https://outlook.live.com" }
                ]
            },
            {
                id: "preset-social",
                name: "Socials",
                icon: "chat",
                visible: true,
                sites: [
                    { name: "WhatsApp", url: "https://web.whatsapp.com" },
                    { name: "Telegram", url: "https://web.telegram.org" },
                    { name: "Twitter / X", url: "https://x.com" },
                    { name: "Reddit", url: "https://reddit.com" }
                ]
            },
            {
                id: "preset-dev",
                name: "Dev & Design",
                icon: "tools",
                visible: true,
                sites: [
                    { name: "GitHub", url: "https://github.com" },
                    { name: "Stack Overflow", url: "https://stackoverflow.com" },
                    { name: "MDN Docs", url: "https://developer.mozilla.org" },
                    { name: "Canva", url: "https://canva.com" }
                ]
            },
            {
                id: "preset-entertainment",
                name: "Entertainment",
                icon: "game",
                visible: true,
                sites: [
                    { name: "YouTube", url: "https://youtube.com" },
                    { name: "Netflix", url: "https://netflix.com" },
                    { name: "Spotify", url: "https://spotify.com" },
                    { name: "Twitch", url: "https://twitch.tv" }
                ]
            }
        ];

        // 1. Immediate synchronous cache resolution (0ms first-frame render)
        let directoriesData = null;
        try {
            const cached = localStorage.getItem("raeen_directories_data");
            if (cached) directoriesData = JSON.parse(cached);
        } catch (e) {}

        if (!directoriesData || !Array.isArray(directoriesData.list) || directoriesData.list.length === 0) {
            directoriesData = {
                show: true,
                list: defaultDirectories
            };
            try {
                localStorage.setItem("raeen_directories_data", JSON.stringify(directoriesData));
            } catch (e) {}
        }

        // 2. Background non-blocking IndexedDB sync (if persistent tier has newer updates)
        (async function syncFromIndexedDb() {
            try {
                const idbData = await StorageManager.get("settings", "directories_data");
                if (idbData && Array.isArray(idbData.list) && idbData.list.length > 0) {
                    const currentStr = JSON.stringify(directoriesData);
                    const idbStr = JSON.stringify(idbData);
                    if (currentStr !== idbStr) {
                        directoriesData = idbData;
                        try {
                            localStorage.setItem("raeen_directories_data", idbStr);
                        } catch (e) {}
                        renderWidget();
                        renderSettings();
                    }
                } else if (directoriesData) {
                    StorageManager.set("settings", "directories_data", directoriesData).catch(() => {});
                }
            } catch (err) {
                console.warn("Directories background sync:", err);
            }
        })();

        // 3. Background non-blocking dashboard title migration
        (async function migrateDashboardTitle() {
            try {
                const mainSettings = await StorageManager.get("settings", "main");
                if (mainSettings && (!mainSettings.dashboardTitle || mainSettings.dashboardTitle === "NewTab")) {
                    mainSettings.dashboardTitle = "New Tab";
                    await saveSettings(mainSettings, true);
                    document.title = "New Tab";
                }
            } catch (err) {
                console.warn("Title migration check:", err);
            }
        })();

        let activeCategoryId = null;
        const getActiveCategory = () => {
            const visibleList = (directoriesData.list || []).filter(c => c.visible);
            if (visibleList.length === 0) return null;
            if (!activeCategoryId || !visibleList.some(c => c.id === activeCategoryId)) {
                activeCategoryId = visibleList[0].id;
            }
            return visibleList.find(c => c.id === activeCategoryId) || visibleList[0];
        };

        const VECTOR_GLYPHS = {
            bot: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="8" rx="3"/><path d="M12 2v6"/><circle cx="9" cy="14" r="1.3" fill="#ffffff"/><circle cx="15" cy="14" r="1.3" fill="#ffffff"/><path d="M2 14h1"/><path d="M21 14h1"/><path d="M10 18h4"/></svg>`,
            folder: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
            chat: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
            tools: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.7 10.7 5.6-5.6a1 1 0 0 0 0-1.4l-3-3a1 1 0 0 0-1.4 0l-5.6 5.6M8.3 15.3l-5.6 5.6a1 1 0 0 0 0 1.4l3 3a1 1 0 0 0 1.4 0l5.6-5.6"/><path d="m9 9 6 6"/></svg>`,
            game: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="6"/><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/></svg>`,
            finance: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="3"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
            git: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v6"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
            star: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
            music: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
            shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
            video: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>`,
            news: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
            book: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/></svg>`
        };

        const getCategoryBadge = (c, size = 'sm') => {
            if (!c) return '';
            const id = (c.id || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            const icon = (c.icon || '').toLowerCase();

            // High-contrast, vibrant Apple system gradients
            let gradient = 'linear-gradient(145deg, #6366f1 0%, #4338ca 100%)';
            let glow = 'rgba(99, 102, 241, 0.4)';
            let svg = VECTOR_GLYPHS.folder;

            if (id.includes('ai') || name.includes('ai') || icon.includes('🤖') || icon.includes('bot')) {
                gradient = 'linear-gradient(145deg, #0ea5e9 0%, #2563eb 55%, #4f46e5 100%)';
                glow = 'rgba(37, 99, 235, 0.45)';
                svg = VECTOR_GLYPHS.bot;
            } else if (id.includes('work') || name.includes('work') || name.includes('doc') || icon.includes('💼') || icon.includes('📁') || icon.includes('folder')) {
                gradient = 'linear-gradient(145deg, #fb923c 0%, #ea580c 55%, #c2410c 100%)';
                glow = 'rgba(234, 88, 12, 0.45)';
                svg = VECTOR_GLYPHS.folder;
            } else if (id.includes('social') || name.includes('social') || icon.includes('💬') || icon.includes('chat') || icon.includes('message')) {
                gradient = 'linear-gradient(145deg, #34d399 0%, #059669 60%, #047857 100%)';
                glow = 'rgba(5, 150, 105, 0.45)';
                svg = VECTOR_GLYPHS.chat;
            } else if (id.includes('dev') || name.includes('dev') || name.includes('code') || icon.includes('🛠') || icon.includes('tool')) {
                gradient = 'linear-gradient(145deg, #c084fc 0%, #9333ea 55%, #7e22ce 100%)';
                glow = 'rgba(147, 51, 234, 0.45)';
                svg = VECTOR_GLYPHS.tools;
            } else if (id.includes('entertain') || name.includes('game') || icon.includes('🎮') || icon.includes('game') || name.includes('play')) {
                gradient = 'linear-gradient(145deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)';
                glow = 'rgba(2, 132, 199, 0.45)';
                svg = VECTOR_GLYPHS.game;
            } else if (id.includes('git') || name.includes('git') || icon.includes('🐙') || icon.includes('git')) {
                gradient = 'linear-gradient(145deg, #fb7185 0%, #e11d48 60%, #be123c 100%)';
                glow = 'rgba(225, 29, 72, 0.45)';
                svg = VECTOR_GLYPHS.git;
            } else if (name.includes('finance') || name.includes('money') || icon.includes('💰') || icon.includes('finance') || name.includes('bank')) {
                gradient = 'linear-gradient(145deg, #facc15 0%, #d97706 60%, #b45309 100%)';
                glow = 'rgba(217, 119, 6, 0.45)';
                svg = VECTOR_GLYPHS.finance;
            } else if (name.includes('star') || name.includes('fav') || icon.includes('⭐') || icon.includes('star')) {
                gradient = 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)';
                glow = 'rgba(245, 158, 11, 0.45)';
                svg = VECTOR_GLYPHS.star;
            } else if (name.includes('music') || name.includes('song') || name.includes('audio') || icon.includes('🎵') || icon.includes('music') || icon.includes('audio')) {
                gradient = 'linear-gradient(145deg, #f43f5e 0%, #e11d48 55%, #9f1239 100%)';
                glow = 'rgba(244, 63, 94, 0.45)';
                svg = VECTOR_GLYPHS.music;
            } else if (name.includes('shop') || name.includes('store') || name.includes('buy') || icon.includes('🛒') || icon.includes('shop')) {
                gradient = 'linear-gradient(145deg, #2dd4bf 0%, #0d9488 60%, #115e59 100%)';
                glow = 'rgba(13, 148, 136, 0.45)';
                svg = VECTOR_GLYPHS.shopping;
            } else if (name.includes('video') || name.includes('movie') || name.includes('stream') || icon.includes('🎬') || icon.includes('video')) {
                gradient = 'linear-gradient(145deg, #ec4899 0%, #db2777 60%, #9d174d 100%)';
                glow = 'rgba(219, 39, 119, 0.45)';
                svg = VECTOR_GLYPHS.video;
            } else if (name.includes('news') || icon.includes('📰') || icon.includes('news')) {
                gradient = 'linear-gradient(145deg, #64748b 0%, #475569 60%, #334155 100%)';
                glow = 'rgba(71, 85, 105, 0.45)';
                svg = VECTOR_GLYPHS.news;
            } else if (name.includes('book') || name.includes('read') || icon.includes('📚') || icon.includes('book')) {
                gradient = 'linear-gradient(145deg, #818cf8 0%, #6366f1 60%, #4338ca 100%)';
                glow = 'rgba(99, 102, 241, 0.45)';
                svg = VECTOR_GLYPHS.book;
            }

            const sizeClass = size === 'lg' ? 'cat-badge-lg' : (size === 'md' ? 'cat-badge-md' : 'cat-badge-sm');
            return `<span class="cat-apple-squircle ${sizeClass}" style="background:${gradient}; --badge-glow:${glow};">${svg}</span>`;
        };

        // Inject Directories CSS styles
        const styleEl = document.createElement("style");
        styleEl.textContent = `
            .directory-container {
                display: flex;
                width: 100%;
                max-width: 900px;
                min-height: 250px;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-top: 1px solid var(--glass-border-light);
                border-left: 1px solid var(--glass-border-light);
                border-radius: 24px;
                overflow: hidden;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                box-shadow: 0 8px 32px var(--shadow);
                margin: 0 auto 2rem auto;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(20px);
                animation: slideUpFade 0.5s ease-out forwards;
            }
            .directory-container.hidden {
                display: none !important;
            }
            .directory-sidebar {
                width: 180px;
                background: rgba(0, 0, 0, 0.15);
                border-right: 1px solid var(--border);
                display: flex;
                flex-direction: column;
                padding: 12px 0;
                flex-shrink: 0;
            }
            [data-theme="light"] .directory-sidebar {
                background: rgba(0, 0, 0, 0.02);
            }
            .directory-sidebar-btn {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 12px 20px;
                background: none;
                border: none;
                color: var(--text-secondary);
                font-family: inherit;
                font-size: 0.88rem;
                font-weight: 500;
                text-align: left;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 3px solid transparent;
            }
            .directory-sidebar-btn:hover {
                background: rgba(255, 255, 255, 0.04);
                color: var(--text-primary);
                padding-left: 24px;
            }
            [data-theme="light"] .directory-sidebar-btn:hover {
                background: rgba(0, 0, 0, 0.03);
            }
            .directory-sidebar-btn.active {
                background: var(--bg-active);
                color: var(--text-primary);
                border-left-color: var(--accent);
                font-weight: 600;
                padding-left: 24px;
            }
            .directory-sidebar-btn span:last-child {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .directory-sidebar-icon {
                font-size: 1.1rem;
            }
            .directory-content {
                flex: 1;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                min-width: 0;
            }
            .directory-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border);
                padding-bottom: 10px;
            }
            .directory-title-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .directory-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            .directory-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 14px;
                overflow-y: auto;
                max-height: 250px;
                padding: 6px;
                scrollbar-width: thin;
                scrollbar-color: var(--border) transparent;
            }
            .directory-grid::-webkit-scrollbar {
                width: 4px;
            }
            .directory-grid::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 3px;
            }
            .directory-card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 10px;
                height: 80px;
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                color: var(--text-primary);
                text-decoration: none;
                font-size: 0.78rem;
                font-weight: 500;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                cursor: pointer;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            [data-theme="light"] .directory-card {
                background: rgba(0, 0, 0, 0.02);
                border: 1px solid rgba(0, 0, 0, 0.04);
            }
            .directory-card:hover {
                transform: translateY(-4px) scale(1.02);
                background: rgba(255, 255, 255, 0.08);
                border-color: var(--accent);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2), 0 0 15px var(--accent-glow);
            }
            [data-theme="light"] .directory-card:hover {
                background: rgba(0, 0, 0, 0.05);
                border-color: var(--accent);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05), 0 0 15px var(--accent-glow);
            }
            .directory-card img {
                width: 24px;
                height: 24px;
                margin-bottom: 6px;
                border-radius: 4px;
                object-fit: contain;
            }
            .directory-card span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }
            .directory-card-delete-btn {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--danger-bg);
                color: var(--danger);
                border: none;
                font-size: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s ease;
                cursor: pointer;
                z-index: 10;
            }
            .directory-card:hover .directory-card-delete-btn {
                opacity: 1;
            }
            .directory-card-delete-btn:hover {
                background: var(--danger);
                color: #fff;
            }
            .directory-card.add-card {
                border-style: dashed;
                border-color: var(--text-secondary);
                opacity: 0.6;
                background: transparent;
            }
            .directory-card.add-card:hover {
                opacity: 1;
                border-color: var(--accent);
                background: rgba(255, 255, 255, 0.02);
            }
            .directory-card .add-card-icon {
                font-size: 1.5rem;
                margin-bottom: 2px;
                color: var(--text-secondary);
            }
            @media (max-width: 600px) {
                .directory-container {
                    flex-direction: column;
                }
                .directory-sidebar {
                    width: 100%;
                    flex-direction: row;
                    overflow-x: auto;
                    border-right: none;
                    border-bottom: 1px solid var(--border);
                    padding: 6px 12px;
                }
                .directory-sidebar-btn {
                    width: auto;
                    padding: 6px 12px;
                    border-left: none;
                    border-bottom: 3px solid transparent;
                    white-space: nowrap;
                }
                .directory-sidebar-btn.active {
                    border-bottom-color: var(--accent);
                }
            }
            
            .cat-apple-squircle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                position: relative;
                border: 0.5px solid rgba(255, 255, 255, 0.25);
                box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 2px 6px rgba(0, 0, 0, 0.25), 0 0 12px var(--badge-glow);
                transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
                vertical-align: middle;
            }
            .cat-apple-squircle:hover {
                transform: scale(1.08);
            }
            .cat-apple-squircle svg {
                filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35));
            }
            .cat-badge-sm {
                width: 20px;
                height: 20px;
                border-radius: 6px;
            }
            .cat-badge-sm svg {
                width: 12px;
                height: 12px;
            }
            .cat-badge-md {
                width: 24px;
                height: 24px;
                border-radius: 7px;
            }
            .cat-badge-md svg {
                width: 14px;
                height: 14px;
            }
            .cat-badge-lg {
                width: 30px;
                height: 30px;
                border-radius: 9px;
            }
            .cat-badge-lg svg {
                width: 17px;
                height: 17px;
            }
            .cat-links-pill {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 6px;
                font-size: 0.72rem;
                font-weight: 500;
                background: rgba(255, 255, 255, 0.08);
                color: var(--text-secondary);
                border: 1px solid rgba(255, 255, 255, 0.06);
                margin-left: 6px;
            }
            .directory-editor-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 14px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                margin-bottom: 8px;
                backdrop-filter: blur(12px);
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .directory-editor-item:hover {
                background: rgba(255, 255, 255, 0.07);
                border-color: rgba(255, 255, 255, 0.16);
                transform: translateY(-1px);
            }

            .directory-editor-item-original {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: var(--bg-element);
                border: 1px solid var(--border);
                border-radius: 8px;
                margin-bottom: 6px;
            }
            .directory-editor-item-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .directory-editor-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }
            .directory-editor-btn {
                padding: 3px 8px;
                border: none;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 600;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s;
            }
            .directory-editor-btn-delete {
                background: var(--danger-bg);
                color: var(--danger);
            }
            .directory-editor-btn-delete:hover {
                background: var(--danger);
                color: #fff;
            }
        `;
        if (document.head && !document.getElementById("directory-injected-styles")) {
            styleEl.id = "directory-injected-styles";
            document.head.appendChild(styleEl);
        }

        // Reference existing or create widget container in DOM
        let dirWidget = document.getElementById("directory-widget");
        if (!dirWidget) {
            const searchWidget = document.getElementById("search-widget");
            dirWidget = document.createElement("section");
            dirWidget.id = "directory-widget";
            dirWidget.className = "directory-container draggable-widget";
            dirWidget.setAttribute("draggable", "false");
            if (searchWidget && searchWidget.parentNode) {
                searchWidget.parentNode.insertBefore(dirWidget, searchWidget.nextSibling);
            } else {
                const col2 = document.getElementById("column-2") || document.querySelector(".container");
                if (col2) col2.appendChild(dirWidget);
            }
        }
        
        if (typeof window.applyWidgetLayout === "function") {
            window.applyWidgetLayout();
        }

        // Add settings tab button
        const sidebar = document.querySelector(".modal-sidebar");
        let tabBtn = document.querySelector('.sidebar-tab[data-target="tab-directories"]');
        if (!tabBtn && sidebar) {
            tabBtn = document.createElement("button");
            tabBtn.className = "sidebar-tab";
            tabBtn.setAttribute("data-target", "tab-directories");
            tabBtn.innerHTML = `
                <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;opacity:0.6;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                Directories
            `;
            sidebar.appendChild(tabBtn);
        }

        // Add settings tab pane
        const modalContent = document.querySelector("#settings-modal .modal-content");
        let pane = document.getElementById("tab-directories");
        if (!pane && modalContent) {
            pane = document.createElement("div");
            pane.id = "tab-directories";
            pane.className = "tab-pane";
            pane.innerHTML = `
                <div class="card-container">
                    <div class="settings-row" style="border-bottom:none;">
                        <span>Show Directory Box on Dashboard</span>
                        <label class="switch">
                            <input type="checkbox" id="toggle-directories-show" checked>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label>Manage Categories</label>
                    <p class="subtext">Configure category folders, visibility, and icons on the dashboard.</p>
                    
                    <div class="directory-editor-box mt-4">
                        <div style="display: flex; gap: 8px;" class="mb-4">
                            <input type="text" id="new-cat-name-input" class="text-input" placeholder="New Category Name (e.g. Finance)">
                            <input type="text" id="new-cat-icon-input" class="text-input" placeholder="Icon / Tag" style="max-width: 100px; text-align: center;">
                            <button id="add-cat-btn-action" class="primary-btn" style="padding: 10px 16px; border-radius: 10px; font-size: 0.88rem;">+ Add</button>
                        </div>
                        
                        <div id="categories-editor-list" class="managed-list">
                            <!-- Managed categories will be rendered here -->
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <label>Import & Export</label>
                    <p class="subtext">Export your directories to backup or import standard browser bookmarks (.html) or JSON files.</p>
                    <div style="display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
                        <button id="export-dir-html-btn" class="focus-btn focus-btn-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; font-size: 13px; border-radius: 8px;">
                            Export to Bookmarks (HTML)
                        </button>
                        <button id="export-dir-json-btn" class="focus-btn focus-btn-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; font-size: 13px; border-radius: 8px;">
                            Export to JSON
                        </button>
                        <button id="import-dir-btn-trigger" class="primary-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; font-size: 13px; border-radius: 8px;">
                            Import File
                        </button>
                        <input type="file" id="import-dir-input" accept=".html,.json" style="display: none;">
                    </div>
                </div>
            `;
            modalContent.appendChild(pane);
        }

        // Add Site modal container for link adding
        let addSiteModal = document.getElementById("add-site-modal");
        if (!addSiteModal) {
            addSiteModal = document.createElement("div");
            addSiteModal.id = "add-site-modal";
            addSiteModal.className = "modal-overlay hidden";
            addSiteModal.style.zIndex = "30000";
            addSiteModal.innerHTML = `
                <div class="modal-container" style="max-width: 400px; height: auto; background: var(--bg-modal); border-radius: 20px; border: 1px solid var(--border);">
                    <header class="modal-header">
                        <h2>Add Link to Category</h2>
                        <button id="close-add-site-btn" class="close-btn">&times;</button>
                    </header>
                    <div class="modal-body" style="display: block; padding: 20px;">
                        <input type="text" id="directory-site-name" class="text-input mb-2" placeholder="Site Name (e.g. Google)">
                        <input type="text" id="directory-site-url" class="text-input mb-2" placeholder="URL (e.g. https://google.com)">
                        <button id="save-directory-site-btn" class="primary-btn" style="width: 100%;">Add Link</button>
                    </div>
                </div>
            `;
            document.body.appendChild(addSiteModal);
        }

        // 4. Rendering Functions
        const saveDirectories = async () => {
            try {
                localStorage.setItem("raeen_directories_data", JSON.stringify(directoriesData));
                await StorageManager.set("settings", "directories_data", directoriesData);
            } catch (err) {
                console.warn("Failed to persist directories data:", err);
            }
            renderWidget();
            renderSettings();
        };

        const renderWidget = () => {
            const isVisible = (directoriesData.show !== false) && (state.settings.showCardDirectories !== false);
            if (!isVisible) {
                dirWidget.classList.add("hidden");
                return;
            }
            
            const visibleList = (directoriesData.list || []).filter(c => c.visible);
            if (visibleList.length === 0) {
                dirWidget.classList.add("hidden");
                return;
            }
            dirWidget.classList.remove("hidden");

            const activeCat = getActiveCategory();
            
            let sidebarHTML = `<div class="directory-sidebar">`;
            visibleList.forEach(c => {
                const isActive = activeCat && c.id === activeCat.id;
                const escapedIcon = escapeHTML(c.icon || '📁');
                const escapedName = escapeHTML(c.name);
                const escapedId = escapeAttribute(c.id);
                sidebarHTML += `
                    <button class="directory-sidebar-btn ${isActive ? 'active' : ''}" data-cat-id="${escapedId}">
                        <span class="directory-sidebar-icon">${getCategoryBadge(c, 'sm')}</span>
                        <span>${escapedName}</span>
                    </button>
                `;
            });
            
            // Add Category button
            sidebarHTML += `
                <button class="directory-sidebar-btn" id="shortcut-add-cat-btn" style="margin-top:auto; opacity:0.6; border-top:1px solid var(--border);">
                    <span class="directory-sidebar-icon" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5.5px;background:rgba(255,255,255,0.08);color:#ffffff;">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                    <span>Add Folder</span>
                </button>
            `;
            sidebarHTML += `</div>`;

            let contentHTML = `<div class="directory-content">`;
            if (activeCat) {
                const escapedCatName = escapeHTML(activeCat.name);
                const headerBadge = getCategoryBadge(activeCat, 'lg');
                contentHTML += `
                    <div class="directory-header">
                        <div class="directory-title-wrapper" style="display:flex;align-items:center;gap:10px;">
                            ${headerBadge}
                            <span class="directory-title">${escapedCatName}</span>
                        </div>
                    </div>
                    <div class="directory-grid">
                `;
                
                (activeCat.sites || []).forEach((site, index) => {
                    let domain = 'google.com';
                    try { domain = new URL(site.url).hostname; } catch(e){}
                    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                    const sanitizedUrl = sanitizeURL(site.url);
                    const escapedIcon = escapeAttribute(favicon);
                    const escapedName = escapeHTML(site.name);
                    const firstChar = escapedName.charAt(0).toUpperCase() || '🔗';
                    contentHTML += `
                        <a href="${sanitizedUrl}" target="_blank" class="directory-card">
                            <button class="directory-card-delete-btn" data-index="${index}">&times;</button>
                            <img src="${escapedIcon}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22><rect width=%2224%22 height=%2224%22 fill=%22%237b61ff%22 rx=%224%22/><text x=%2212%22 y=%2216%22 font-family=%22sans-serif%22 font-size=%2212%22 fill=%22white%22 font-weight=%22bold%22 text-anchor=%22middle%22>${firstChar}</text></svg>'">
                            <span>${escapedName}</span>
                        </a>
                    `;
                });

                // Add Link Card
                contentHTML += `
                        <div class="directory-card add-card" id="card-add-site-action">
                            <div class="add-card-icon">+</div>
                            <span>Add Link</span>
                        </div>
                    </div>
                `;
            } else {
                contentHTML += `<div class="notes-empty">No active categories found. Enable them in settings.</div>`;
            }
            contentHTML += `</div>`;

            dirWidget.innerHTML = `<div class="drag-handle">⋮⋮</div>` + sidebarHTML + contentHTML + `<div class="resize-handle"></div>`;

            // Click Handlers
            dirWidget.querySelectorAll(".directory-sidebar-btn").forEach(btn => {
                if (btn.id === "shortcut-add-cat-btn") {
                    btn.onclick = () => {
                        const settingsBtn = document.getElementById("settings-btn");
                        if (settingsBtn) settingsBtn.click();
                        tabBtn.click();
                        setTimeout(() => {
                            const nameInput = document.getElementById("new-cat-name-input");
                            if (nameInput) nameInput.focus();
                        }, 300);
                    };
                    return;
                }
                btn.onclick = () => {
                    activeCategoryId = btn.dataset.catId;
                    renderWidget();
                };
            });

            dirWidget.querySelectorAll(".directory-card-delete-btn").forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    if (activeCat && activeCat.sites) {
                        activeCat.sites.splice(index, 1);
                        saveDirectories();
                    }
                };
            });

            const addSiteBtn = dirWidget.querySelector("#card-add-site-action");
            if (addSiteBtn) {
                addSiteBtn.onclick = () => {
                    addSiteModal.classList.remove("hidden");
                    document.getElementById("directory-site-name").focus();
                };
            }
        };

        const renderSettings = () => {
            const listContainer = document.getElementById("categories-editor-list");
            if (!listContainer) return;
            
            listContainer.innerHTML = (directoriesData.list || []).map((c, index) => {
                const badge = getCategoryBadge(c, 'md');
                const escapedName = escapeHTML(c.name);
                const escapedCount = c.sites ? c.sites.length : 0;
                return `
                    <div class="directory-editor-item">
                        <div class="directory-editor-item-left" style="display:flex;align-items:center;">
                            ${badge}
                            <strong style="margin-left: 10px; font-weight: 600; font-size: 0.88rem; color: #ffffff;">${escapedName}</strong>
                            <span class="cat-links-pill">${escapedCount} links</span>
                        </div>
                        <div class="directory-editor-actions">
                            <label class="switch switch-sm" style="margin-right: 10px;">
                                <input type="checkbox" class="cat-visibility-checkbox" data-index="${index}" ${c.visible ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                            <button class="directory-editor-btn directory-editor-btn-delete" data-index="${index}">Delete</button>
                        </div>
                    </div>
                `;
            }).join("");

            listContainer.querySelectorAll(".cat-visibility-checkbox").forEach(box => {
                box.onchange = () => {
                    const index = parseInt(box.dataset.index);
                    directoriesData.list[index].visible = box.checked;
                    saveDirectories();
                };
            });

            listContainer.querySelectorAll(".directory-editor-btn-delete").forEach(btn => {
                btn.onclick = () => {
                    if (confirm("Are you sure you want to delete this category and all its links?")) {
                        const index = parseInt(btn.dataset.index);
                        directoriesData.list.splice(index, 1);
                        saveDirectories();
                    }
                };
            });
        };

        // Tab button click
        tabBtn.onclick = () => {
            document.querySelectorAll(".sidebar-tab").forEach(tab => tab.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            tabBtn.classList.add("active");
            pane.classList.add("active");
        };

        document.querySelectorAll(".sidebar-tab").forEach(otherTab => {
            if (otherTab.getAttribute("data-target") !== "tab-directories") {
                const originalClick = otherTab.onclick;
                otherTab.onclick = (event) => {
                    pane.classList.remove("active");
                    tabBtn.classList.remove("active");
                    if (originalClick) originalClick.call(otherTab, event);
                };
            }
        });

        const showToggle = document.getElementById("toggle-directories-show");
        if (showToggle) {
            showToggle.checked = (directoriesData.show !== false) && (state.settings.showCardDirectories !== false);
            showToggle.onchange = () => {
                directoriesData.show = showToggle.checked;
                state.settings.showCardDirectories = showToggle.checked;
                if (dom.toggleCardDirectories) dom.toggleCardDirectories.checked = showToggle.checked;
                saveSettings(state.settings);
                saveDirectories();
            };
        }

        const addCatBtn = document.getElementById("add-cat-btn-action");
        if (addCatBtn) {
            addCatBtn.onclick = () => {
                const nameInput = document.getElementById("new-cat-name-input");
                const iconInput = document.getElementById("new-cat-icon-input");
                const name = nameInput.value.trim();
                const icon = iconInput.value.trim() || "📁";
                
                if (!name) {
                    alert("Please enter a category name.");
                    return;
                }
                
                const newCat = {
                    id: "cat_" + Date.now(),
                    name: name,
                    icon: icon,
                    visible: true,
                    sites: []
                };
                
                directoriesData.list.push(newCat);
                nameInput.value = "";
                iconInput.value = "";
                saveDirectories();
            };
        }

        // Add Site Modal dismiss handlers
        const closeAddSiteBtn = document.getElementById("close-add-site-btn");
        if (closeAddSiteBtn) {
            closeAddSiteBtn.onclick = () => addSiteModal.classList.add("hidden");
        }
        addSiteModal.onclick = (e) => {
            if (e.target === addSiteModal) addSiteModal.classList.add("hidden");
        };

        const saveSiteBtn = document.getElementById("save-directory-site-btn");
        if (saveSiteBtn) {
            saveSiteBtn.onclick = () => {
                const nameInput = document.getElementById("directory-site-name");
                const urlInput = document.getElementById("directory-site-url");
                const name = nameInput.value.trim();
                let url = urlInput.value.trim();
                
                if (!name || !url) {
                    alert("Please enter both a name and a URL.");
                    return;
                }
                
                if (!/^https?:\/\//i.test(url)) {
                    url = "https://" + url;
                }

                const activeCat = getActiveCategory();
                if (activeCat) {
                    activeCat.sites = activeCat.sites || [];
                    activeCat.sites.push({ name, url });
                    nameInput.value = "";
                    urlInput.value = "";
                    addSiteModal.classList.add("hidden");
                    saveDirectories();
                }
            };
        }

        // Netscape Bookmarks parser helper
        const parseHTMLBookmarks = (htmlText) => {
            const lines = htmlText.split('\n');
            const categories = [];
            let currentCat = null;
            
            lines.forEach(line => {
                line = line.trim();
                const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i);
                if (h3Match) {
                    const catName = h3Match[1].replace(/<[^>]*>/g, '').trim();
                    currentCat = {
                        id: "cat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                        name: catName,
                        icon: "📁",
                        visible: true,
                        sites: []
                    };
                    categories.push(currentCat);
                } else {
                    const aMatch = line.match(/<A[^>]+HREF=["']([^"']*)["'][^>]*>(.*?)<\/A>/i);
                    if (aMatch) {
                        const url = aMatch[1].trim();
                        const name = aMatch[2].replace(/<[^>]*>/g, '').trim();
                        if (currentCat) {
                            currentCat.sites.push({ name, url });
                        } else {
                            if (categories.length === 0) {
                                currentCat = {
                                    id: "cat_" + Date.now(),
                                    name: "Imported Links",
                                    icon: "📁",
                                    visible: true,
                                    sites: []
                                };
                                categories.push(currentCat);
                            }
                            categories[0].sites.push({ name, url });
                        }
                    }
                }
            });
            return categories;
        };

        const exportHTMLBtn = document.getElementById("export-dir-html-btn");
        if (exportHTMLBtn) {
            exportHTMLBtn.onclick = () => {
                let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This is an automatically generated file.\n     It will be read and written.\n     DO NOT EDIT! -->\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n`;
                directoriesData.list.forEach(cat => {
                    html += `    <DT><H3>${cat.name}</H3>\n    <DL><p>\n`;
                    (cat.sites || []).forEach(site => {
                        html += `        <DT><A HREF="${site.url}">${site.name}</A>\n`;
                    });
                    html += `    </DL><p>\n`;
                });
                html += `</DL><p>\n`;
                
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "raeen_workspace_bookmarks.html";
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        const exportJSONBtn = document.getElementById("export-dir-json-btn");
        if (exportJSONBtn) {
            exportJSONBtn.onclick = () => {
                const blob = new Blob([JSON.stringify(directoriesData.list, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "raeen_workspace_directories.json";
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        const importBtnTrigger = document.getElementById("import-dir-btn-trigger");
        const importInput = document.getElementById("import-dir-input");
        if (importBtnTrigger && importInput) {
            importBtnTrigger.onclick = () => importInput.click();
            importInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        let importedList = [];
                        if (file.name.endsWith(".json")) {
                            const parsed = JSON.parse(event.target.result);
                            if (Array.isArray(parsed)) {
                                importedList = parsed.map(c => ({
                                    id: c.id || "cat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                                    name: c.name || "Custom Folder",
                                    icon: c.icon || "📁",
                                    visible: c.visible !== false,
                                    sites: Array.isArray(c.sites) ? c.sites.map(s => ({ name: s.name || "Link", url: s.url || "https://google.com" })) : []
                                }));
                            } else {
                                throw new Error("Invalid JSON format");
                            }
                        } else {
                            importedList = parseHTMLBookmarks(event.target.result);
                        }
                        
                        if (importedList.length > 0) {
                            if (confirm(`Successfully parsed ${importedList.length} folders. Do you want to merge them with your existing categories? (Cancel will overwrite them)`)) {
                                directoriesData.list = [...directoriesData.list, ...importedList];
                            } else {
                                directoriesData.list = importedList;
                            }
                            await saveDirectories();
                            alert("Directories imported successfully!");
                        } else {
                            alert("No folders or links detected in the imported file.");
                        }
                    } catch (err) {
                        console.error("Import failed", err);
                        alert("Failed to parse bookmark file. Please make sure it is a valid Netscape Bookmarks HTML or custom exported JSON file.");
                    }
                };
                reader.readAsText(file);
            };
        }

        // Expose renderWidget globally so settings toggles can re-render it
        window.renderDirectoriesWidget = () => {
            if (dom.toggleCardDirectories) {
                directoriesData.show = dom.toggleCardDirectories.checked;
            }
            renderWidget();
        };

        // Render initially
        renderWidget();
        renderSettings();
    }

    // ─── Free-Position Drag & Drop / Resize Widget System ───
    (function() {
        const defaultPositions = {
            "clock-widget": { left: "2.5%", top: "2.5%" },
            "search-widget": { left: "26%", top: "3.5%" },
            "card-date": { left: "3.5%", top: "16%" },
            "card-focus": { left: "3.5%", top: "47%" },
            "card-security": { left: "3.5%", top: "16%" },
            "card-dns-shield": { left: "26%", top: "16%" },
            "card-image-compressor": { left: "3.5%", top: "16%" },
            "card-pdf-tools": { left: "26%", top: "16%" },
            "directory-widget": { left: "26%", top: "16%" },
            "top-sites-widget": { left: "26%", top: "72%" },
            "notes-widget": { left: "71.5%", top: "16%" },
            "card-fileshare": { left: "71.5%", top: "58%" }
        };

        const defaultSizes = {
            "clock-widget": { width: "auto", height: "auto" },
            "search-widget": { width: "580px", height: "auto" },
            "card-date": { width: "280px", height: "auto" },
            "card-security": { width: "280px", height: "auto" },
            "card-dns-shield": { width: "560px", height: "auto" },
            "card-image-compressor": { width: "280px", height: "auto" },
            "card-pdf-tools": { width: "560px", height: "auto" },
            "directory-widget": { width: "580px", height: "480px" },
            "notes-widget": { width: "280px", height: "320px" },
            "card-focus": { width: "280px", height: "auto" },
            "card-fileshare": { width: "280px", height: "auto" },
            "top-sites-widget": { width: "560px", height: "auto" }
        };

        // Create snap guide lines dynamically if they don't exist
        let snapLineX = document.getElementById("snap-line-x");
        let snapLineY = document.getElementById("snap-line-y");
        if (!snapLineX) {
            snapLineX = document.createElement("div");
            snapLineX.id = "snap-line-x";
            snapLineX.className = "snap-line snap-line-vertical";
            document.body.appendChild(snapLineX);
        }
        if (!snapLineY) {
            snapLineY = document.createElement("div");
            snapLineY.id = "snap-line-y";
            snapLineY.className = "snap-line snap-line-horizontal";
            document.body.appendChild(snapLineY);
        }

        function showSnapLineX(x) {
            snapLineX.style.left = `${x}px`;
            snapLineX.style.display = "block";
        }
        function hideSnapLineX() {
            snapLineX.style.display = "none";
        }
        function showSnapLineY(y) {
            snapLineY.style.top = `${y}px`;
            snapLineY.style.display = "block";
        }
        function hideSnapLineY() {
            snapLineY.style.display = "none";
        }

        // Save positions as viewport percentages
        function saveWidgetPositions() {
            const positions = {};
            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (widget.id) {
                    positions[widget.id] = {
                        left: widget.style.left,
                        top: widget.style.top
                    };
                }
            });
            localStorage.setItem("raeen_widget_positions", JSON.stringify(positions));
        }

        // Save sizes in pixels
        function saveWidgetSizes() {
            const sizes = {};
            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (widget.id) {
                    sizes[widget.id] = {
                        width: widget.style.width,
                        height: widget.style.height
                    };
                }
            });
            localStorage.setItem("raeen_widget_sizes", JSON.stringify(sizes));
        }

        // Restore widget sizes from localStorage or fallback to defaults
        function applyWidgetSizes() {
            let saved = localStorage.getItem("raeen_widget_sizes");
            let sizes = {};
            if (saved) {
                try {
                    sizes = JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse saved sizes", e);
                }
            }

            // Clear legacy 170px hardcoded height for card-focus
            if (sizes && sizes["card-focus"]?.height === "170px") {
                sizes["card-focus"].height = "auto";
                localStorage.setItem("raeen_widget_sizes", JSON.stringify(sizes));
            }

            const mode = state.settings?.dashboardMode || 'pro';
            const modeSizes = {
                focus: {
                    "card-focus": { width: "560px", height: "auto" }
                }
            };
            const activeModeSizes = modeSizes[mode] || {};
            const nonFixedWidgets = ["card-focus", "card-date", "card-security", "card-dns-shield", "card-image-compressor", "top-sites-widget", "search-widget", "clock-widget"];

            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (!widget.id) return;
                if (widget.id === "clock-widget") {
                    widget.style.width = "auto";
                    widget.style.height = "auto";
                    return;
                }
                if (nonFixedWidgets.includes(widget.id)) {
                    widget.style.height = "auto";
                }
                const size = sizes[widget.id] || activeModeSizes[widget.id] || defaultSizes[widget.id];
                if (size) {
                    if (size.width) widget.style.width = size.width;
                    if (size.height && !nonFixedWidgets.includes(widget.id)) {
                        widget.style.height = size.height;
                    }
                }
            });
        }

        // Restore widget positions from localStorage or fallback to defaults
        function applyWidgetPositions() {
            ensureDragAndResizeHandles();
            let saved = localStorage.getItem("raeen_widget_positions");
            let positions = {};
            if (saved) {
                try {
                    positions = JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse saved positions", e);
                }
            }

            // Detect and discard corrupted or colliding positions from previous versions
            let isCorrupted = false;
            if (saved && positions) {
                const keys = Object.keys(positions);
                if (keys.length > 0) {
                    const zeroes = keys.filter(k => positions[k]?.left === "0%" || positions[k]?.top === "0%").length;
                    if (zeroes >= 2 || 
                        positions["card-focus"]?.left === "4%" || 
                        positions["card-date"]?.left === "4%" ||
                        positions["card-focus"]?.left === "71%" ||
                        positions["card-security"]?.left === "10%" ||
                        positions["directory-widget"]?.left === "31%") {
                        isCorrupted = true;
                    }
                }
            }
            if (isCorrupted) {
                localStorage.removeItem("raeen_widget_positions");
                positions = {};
            }

            // Heal colliding card-focus position if stuck at 50% or 58%
            if (positions && positions["card-focus"]?.left === "3.5%" && (positions["card-focus"]?.top === "50%" || positions["card-focus"]?.top === "58%")) {
                positions["card-focus"].top = "47%";
                localStorage.setItem("raeen_widget_positions", JSON.stringify(positions));
            }

            const mode = state.settings?.dashboardMode || 'pro';
            const modeLayouts = {
                focus: {
                    "card-date": { left: "3.5%", top: "16%" },
                    "card-focus": { left: "26%", top: "16%" },
                    "top-sites-widget": { left: "26%", top: "48%" },
                    "notes-widget": { left: "71.5%", top: "16%" }
                },
                creator: {
                    "card-image-compressor": { left: "3.5%", top: "16%" },
                    "card-pdf-tools": { left: "26%", top: "16%" },
                    "top-sites-widget": { left: "26%", top: "72%" },
                    "notes-widget": { left: "71.5%", top: "16%" },
                    "card-fileshare": { left: "71.5%", top: "58%" }
                },
                security: {
                    "card-security": { left: "3.5%", top: "16%" },
                    "card-dns-shield": { left: "26%", top: "16%" },
                    "top-sites-widget": { left: "26%", top: "72%" },
                    "notes-widget": { left: "71.5%", top: "16%" }
                },
                pro: {
                    "card-date": { left: "3.5%", top: "16%" },
                    "card-focus": { left: "3.5%", top: "47%" },
                    "directory-widget": { left: "26%", top: "16%" },
                    "top-sites-widget": { left: "26%", top: "72%" },
                    "notes-widget": { left: "71.5%", top: "16%" },
                    "card-fileshare": { left: "71.5%", top: "58%" }
                }
            };
            const activeModeDefaults = modeLayouts[mode] || {};

            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (!widget.id) return;
                const pos = positions[widget.id] || activeModeDefaults[widget.id] || defaultPositions[widget.id];
                if (pos) {
                    if (pos.left) widget.style.left = pos.left;
                    if (pos.top) widget.style.top = pos.top;
                }
            });

            applyWidgetSizes();
            setupDraggingAndResizing();
        }

        function ensureDragAndResizeHandles() {
            const activeWidgets = document.querySelectorAll(".draggable-widget");
            const nonResizableWidgets = ["clock-widget", "search-widget", "card-date", "card-focus", "card-security", "card-dns-shield", "card-image-compressor", "top-sites-widget"];
            activeWidgets.forEach(widget => {
                if (!widget.querySelector(".drag-handle")) {
                    const handle = document.createElement("div");
                    handle.className = "drag-handle";
                    handle.innerText = "⋮⋮";
                    widget.insertBefore(handle, widget.firstChild);
                }
                if (nonResizableWidgets.includes(widget.id)) {
                    widget.querySelectorAll(".resize-handle").forEach(el => el.remove());
                } else if (!widget.querySelector(".resize-handle")) {
                    const rHandle = document.createElement("div");
                    rHandle.className = "resize-handle";
                    widget.appendChild(rHandle);
                }
            });
        }

        let clampFrame = null;

        // Perform layout clamping on window resize (without overwriting default positions)
        function clampWidgetsOnScreen() {
            clampFrame = null;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            if (viewportWidth < 500 || viewportHeight < 400) return;

            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (widget.classList.contains("hidden")) return;
                const rect = widget.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;
                
                let leftPx = rect.left;
                let topPx = rect.top;
                
                const maxLeft = Math.max(0, viewportWidth - rect.width);
                const maxTop = Math.max(0, viewportHeight - rect.height);
                
                if (leftPx > maxLeft || topPx > maxTop || leftPx < 0 || topPx < 0) {
                    leftPx = Math.max(0, Math.min(leftPx, maxLeft));
                    topPx = Math.max(0, Math.min(topPx, maxTop));
                    widget.style.left = `${(leftPx / viewportWidth) * 100}%`;
                    widget.style.top = `${(topPx / viewportHeight) * 100}%`;
                }
            });
        }

        function scheduleWidgetClamp() {
            if (clampFrame !== null) return;
            clampFrame = requestAnimationFrame(clampWidgetsOnScreen);
        }

        window.addEventListener("resize", scheduleWidgetClamp);

        function getSnapTargets(widget) {
            return Array.from(document.querySelectorAll(".draggable-widget"))
                .filter(other => {
                    if (other === widget || other.classList.contains("hidden")) return false;
                    const style = window.getComputedStyle(other);
                    return style.display !== "none" && style.visibility !== "hidden";
                })
                .map(other => other.getBoundingClientRect());
        }

        // Snapping helper for dragging
        function snapWidget(rect, leftPx, topPx, snapTargets) {
            const snapThreshold = 15; // px
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let snappedLeft = leftPx;
            let snappedTop = topPx;
            let snappedX = null;
            let snappedY = null;
            
            const w = rect.width;
            const h = rect.height;
            
            // 1. Screen boundaries snapping
            if (Math.abs(leftPx) < snapThreshold) {
                snappedLeft = 0;
                snappedX = 0;
            } else if (Math.abs(leftPx + w - viewportWidth) < snapThreshold) {
                snappedLeft = viewportWidth - w;
                snappedX = viewportWidth;
            }
            
            if (Math.abs(topPx) < snapThreshold) {
                snappedTop = 0;
                snappedY = 0;
            } else if (Math.abs(topPx + h - viewportHeight) < snapThreshold) {
                snappedTop = viewportHeight - h;
                snappedY = viewportHeight;
            }
            
            // 2. Sibling widget snapping
            snapTargets.forEach(otherRect => {
                // Horizontal edge snapping
                if (snappedX === null) {
                    if (Math.abs(leftPx - otherRect.left) < snapThreshold) {
                        snappedLeft = otherRect.left;
                        snappedX = otherRect.left;
                    } else if (Math.abs(leftPx + w - otherRect.right) < snapThreshold) {
                        snappedLeft = otherRect.right - w;
                        snappedX = otherRect.right;
                    } else if (Math.abs(leftPx - otherRect.right) < snapThreshold) {
                        snappedLeft = otherRect.right + 12; // adjacent with 12px gap
                        snappedX = otherRect.right;
                    } else if (Math.abs(leftPx + w - otherRect.left) < snapThreshold) {
                        snappedLeft = otherRect.left - w - 12; // adjacent with 12px gap
                        snappedX = otherRect.left;
                    }
                }
                
                // Vertical edge snapping
                if (snappedY === null) {
                    if (Math.abs(topPx - otherRect.top) < snapThreshold) {
                        snappedTop = otherRect.top;
                        snappedY = otherRect.top;
                    } else if (Math.abs(topPx + h - otherRect.bottom) < snapThreshold) {
                        snappedTop = otherRect.bottom - h;
                        snappedY = otherRect.bottom;
                    } else if (Math.abs(topPx - otherRect.bottom) < snapThreshold) {
                        snappedTop = otherRect.bottom + 12; // adjacent with 12px gap
                        snappedY = otherRect.bottom;
                    } else if (Math.abs(topPx + h - otherRect.top) < snapThreshold) {
                        snappedTop = otherRect.top - h - 12; // adjacent with 12px gap
                        snappedY = otherRect.top;
                    }
                }
            });
            
            return { left: snappedLeft, top: snappedTop, snappedX, snappedY };
        }

        // Snapping helper for resizing
        function snapResize(widthPx, heightPx, startRect, snapTargets) {
            const snapThreshold = 15; // px
            let snappedWidth = widthPx;
            let snappedHeight = heightPx;
            let snappedX = null;
            let snappedY = null;
            
            const leftPx = startRect.left;
            const topPx = startRect.top;
            
            snapTargets.forEach(otherRect => {
                const rightPx = leftPx + widthPx;
                const bottomPx = topPx + heightPx;
                
                // Width snap (right border alignments)
                if (snappedX === null) {
                    if (Math.abs(rightPx - otherRect.right) < snapThreshold) {
                        snappedWidth = otherRect.right - leftPx;
                        snappedX = otherRect.right;
                    } else if (Math.abs(rightPx - otherRect.left) < snapThreshold) {
                        snappedWidth = otherRect.left - leftPx;
                        snappedX = otherRect.left;
                    } else if (Math.abs(widthPx - otherRect.width) < snapThreshold) {
                        snappedWidth = otherRect.width;
                    }
                }
                
                // Height snap (bottom border alignments)
                if (snappedY === null) {
                    if (Math.abs(bottomPx - otherRect.bottom) < snapThreshold) {
                        snappedHeight = otherRect.bottom - topPx;
                        snappedY = otherRect.bottom;
                    } else if (Math.abs(bottomPx - otherRect.top) < snapThreshold) {
                        snappedHeight = otherRect.top - topPx;
                        snappedY = otherRect.top;
                    } else if (Math.abs(heightPx - otherRect.height) < snapThreshold) {
                        snappedHeight = otherRect.height;
                    }
                }
            });
            
            return { width: snappedWidth, height: snappedHeight, snappedX, snappedY };
        }

        // Register drag & resize listeners using Event Delegation + Pointer Capture API
        function setupDraggingAndResizing() {
            // Remove any old global listener to prevent duplicate binding
            if (window._globalPointerDownListener) {
                document.removeEventListener("pointerdown", window._globalPointerDownListener);
            }
            
            window._globalPointerDownListener = (e) => {
                if (state.settings.enableDragAndDrop === false) return;
                if (e.button !== 0) return; // Left click only
                
                const dragHandle = e.target.closest(".drag-handle");
                const resizeHandle = e.target.closest(".resize-handle");
                
                if (dragHandle) {
                    const widget = dragHandle.closest(".draggable-widget");
                    if (!widget) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    widget.classList.add("active-dragging");
                    
                    const rect = widget.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const offsetY = e.clientY - rect.top;
                    
                    const snapTargets = getSnapTargets(widget);
                    
                    dragHandle.setPointerCapture(e.pointerId);
                    
                    const onPointerMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        let leftPx = moveEvent.clientX - offsetX;
                        let topPx = moveEvent.clientY - offsetY;
                        
                        // Apply snapping
                        const snapResult = snapWidget(rect, leftPx, topPx, snapTargets);
                        leftPx = snapResult.left;
                        topPx = snapResult.top;
                        
                        // Visual guides
                        if (snapResult.snappedX !== null) {
                            showSnapLineX(snapResult.snappedX);
                        } else {
                            hideSnapLineX();
                        }
                        
                        if (snapResult.snappedY !== null) {
                            showSnapLineY(snapResult.snappedY);
                        } else {
                            hideSnapLineY();
                        }
                        
                        widget.style.left = `${(leftPx / window.innerWidth) * 100}%`;
                        widget.style.top = `${(topPx / window.innerHeight) * 100}%`;
                    };
                    
                    const onPointerUp = (upEvent) => {
                        dragHandle.releasePointerCapture(upEvent.pointerId);
                        widget.classList.remove("active-dragging");
                        dragHandle.removeEventListener("pointermove", onPointerMove);
                        dragHandle.removeEventListener("pointerup", onPointerUp);
                        
                        hideSnapLineX();
                        hideSnapLineY();
                        
                        saveWidgetPositions();
                    };
                    
                    dragHandle.addEventListener("pointermove", onPointerMove);
                    dragHandle.addEventListener("pointerup", onPointerUp);
                }
                
                else if (resizeHandle) {
                    const widget = resizeHandle.closest(".draggable-widget");
                    if (!widget) return;
                    
                    const nonResizableWidgets = ["clock-widget", "card-date", "card-focus", "card-security"];
                    if (nonResizableWidgets.includes(widget.id)) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    widget.classList.add("active-dragging");
                    
                    const rect = widget.getBoundingClientRect();
                    const startWidth = rect.width;
                    const startHeight = rect.height;
                    const startX = e.clientX;
                    const startY = e.clientY;
                    
                    const snapTargets = getSnapTargets(widget);
                    
                    resizeHandle.setPointerCapture(e.pointerId);
                    
                    const onPointerMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        const dx = moveEvent.clientX - startX;
                        const dy = moveEvent.clientY - startY;
                        
                        let widthPx = startWidth + dx;
                        let heightPx = startHeight + dy;
                        
                        // Snapping
                        const snapResult = snapResize(widthPx, heightPx, rect, snapTargets);
                        widthPx = snapResult.width;
                        heightPx = snapResult.height;
                        
                        if (snapResult.snappedX !== null) {
                            showSnapLineX(snapResult.snappedX);
                        } else {
                            hideSnapLineX();
                        }
                        
                        if (snapResult.snappedY !== null) {
                            showSnapLineY(snapResult.snappedY);
                        } else {
                            hideSnapLineY();
                        }
                        
                        widthPx = Math.max(150, Math.min(widthPx, window.innerWidth - rect.left));
                        heightPx = Math.max(60, Math.min(heightPx, window.innerHeight - rect.top));
                        
                        widget.style.width = `${widthPx}px`;
                        widget.style.height = `${heightPx}px`;
                    };
                    
                    const onPointerUp = (upEvent) => {
                        resizeHandle.releasePointerCapture(upEvent.pointerId);
                        widget.classList.remove("active-dragging");
                        resizeHandle.removeEventListener("pointermove", onPointerMove);
                        resizeHandle.removeEventListener("pointerup", onPointerUp);
                        
                        hideSnapLineX();
                        hideSnapLineY();
                        
                        saveWidgetSizes();
                    };
                    
                    resizeHandle.addEventListener("pointermove", onPointerMove);
                    resizeHandle.addEventListener("pointerup", onPointerUp);
                }
            };
            
            document.addEventListener("pointerdown", window._globalPointerDownListener);
        }

        // Layout reset handler
        const resetBtn = document.getElementById("reset-layout-btn");
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm("Reset all widgets to their default layout positions and sizes?")) {
                    localStorage.removeItem("raeen_widget_positions");
                    localStorage.removeItem("raeen_widget_sizes");
                    
                    document.querySelectorAll(".draggable-widget").forEach(widget => {
                        widget.style.left = "";
                        widget.style.top = "";
                        widget.style.width = "";
                        widget.style.height = "";
                    });
                    
                    applyWidgetPositions();
                }
            };
        }

        // Expose helpers globally
        window.applyWidgetLayout = applyWidgetPositions;
        window.saveWidgetLayout = () => {
            saveWidgetPositions();
            saveWidgetSizes();
        };

        // Run layout positioning
        applyWidgetPositions();
    })();

    // ─── Universal Agent Command Bus & Studio Engine Integration ───
    (function initAgentBus() {
        // Workspace Layout Commands
        GlobalCommandBus.register('workspace:setMode', async ({ mode }) => {
            applyDashboardPreset(mode);
            return { mode };
        });

        GlobalCommandBus.register('workspace:resetLayout', async () => {
            localStorage.removeItem("raeen_widget_positions");
            localStorage.removeItem("raeen_widget_sizes");
            document.querySelectorAll(".draggable-widget").forEach(widget => {
                widget.style.left = "";
                widget.style.top = "";
                widget.style.width = "";
                widget.style.height = "";
            });
            if (typeof window.applyWidgetLayout === 'function') window.applyWidgetLayout();
            applyDashboardPreset('pro');
            return { reset: true };
        });

        GlobalCommandBus.register('widget:setPosition', async ({ widgetId, left, top }) => {
            const widget = document.getElementById(widgetId);
            if (!widget) return { success: false, error: `Widget #${widgetId} not found` };
            if (left) widget.style.left = left;
            if (top) widget.style.top = top;
            if (typeof window.saveWidgetLayout === 'function') window.saveWidgetLayout();
            return { widgetId, left, top };
        });

        GlobalCommandBus.register('widget:setSize', async ({ widgetId, width, height }) => {
            const widget = document.getElementById(widgetId);
            if (!widget) return { success: false, error: `Widget #${widgetId} not found` };
            if (width) widget.style.width = width;
            if (height) widget.style.height = height;
            if (typeof window.saveWidgetLayout === 'function') window.saveWidgetLayout();
            return { widgetId, width, height };
        });

        GlobalCommandBus.register('widget:toggleVisibility', async ({ widgetId, visible }) => {
            const widget = document.getElementById(widgetId);
            if (!widget) return { success: false, error: `Widget #${widgetId} not found` };
            widget.classList.toggle('hidden', !visible);
            return { widgetId, visible };
        });

        // Security & Privacy Commands
        GlobalCommandBus.register('security:connectVpn', async ({ nodeId }) => {
            return await securityManager.connect(nodeId);
        });

        GlobalCommandBus.register('security:disconnectVpn', async () => {
            return await securityManager.disconnect();
        });

        GlobalCommandBus.register('security:setWebRTCShield', async ({ enabled }) => {
            return await securityManager.setWebRtcShield(enabled);
        });

        GlobalCommandBus.register('security:setKillSwitch', async ({ enabled }) => {
            return await securityManager.setKillSwitch(enabled);
        });

        GlobalCommandBus.register('security:clearTraces', async () => {
            return await securityManager.triggerClearTraces();
        });

        // Notes Commands
        GlobalCommandBus.register('notes:create', async ({ title, content }) => {
            await openNoteEditor();
            if (dom.noteEditorTitle && title) dom.noteEditorTitle.value = title;
            if (dom.noteEditorBody && content) dom.noteEditorBody.value = content;
            await saveCurrentNote();
            renderNotesList();
            return { created: true, title };
        });

        GlobalCommandBus.register('notes:delete', async ({ id }) => {
            if (id) {
                await StorageManager.remove('notes', id);
                renderNotesList();
            }
            return { deleted: id };
        });

        GlobalCommandBus.register('notes:update', async ({ id, content }) => {
            if (id) {
                const note = (await StorageManager.get('notes', id)) || { id, title: 'Note' };
                note.body = content;
                note.updated = Date.now();
                await StorageManager.set('notes', id, note);
                renderNotesList();
            }
            return { updated: id };
        });

        // Focus Timer Commands
        GlobalCommandBus.register('timer:start', async () => {
            const startBtn = document.getElementById('focus-start-btn');
            if (startBtn) startBtn.click();
            return { started: true };
        });

        GlobalCommandBus.register('timer:pause', async () => {
            const pauseBtn = document.getElementById('focus-pause-btn');
            if (pauseBtn) pauseBtn.click();
            return { paused: true };
        });

        GlobalCommandBus.register('timer:reset', async () => {
            const resetBtn = document.getElementById('focus-reset-btn');
            if (resetBtn) resetBtn.click();
            return { reset: true };
        });

        // Creative Studio Engine Commands
        GlobalCommandBus.register('studio:loadImage', async ({ sourceUrl }) => {
            if (sourceUrl) await GlobalStudioEngine.loadImage(sourceUrl);
            return { loaded: true };
        });

        GlobalCommandBus.register('studio:applyFilter', async ({ filter, value }) => {
            GlobalStudioEngine.applyFilter(filter, value);
            return { filterApplied: filter };
        });

        GlobalCommandBus.register('studio:clearCanvas', async () => {
            GlobalStudioEngine.saveSnapshot();
            GlobalStudioEngine.getActiveLayer()?.clear();
            GlobalStudioEngine.render();
            return { cleared: true };
        });

        GlobalCommandBus.register('studio:exportCanvas', async ({ format, quality }) => {
            const dataUrl = GlobalStudioEngine.export(format, quality);
            return { dataUrl };
        });

        GlobalCommandBus.register('photocraft:setTool', async ({ tool }) => {
            GlobalStudioEngine.activeTool = tool;
            return { tool };
        });

        GlobalCommandBus.register('photocraft:applyFilter', async ({ filter, value }) => {
            GlobalStudioEngine.applyFilter(filter, value);
            return { filterApplied: filter };
        });

        GlobalCommandBus.register('photocraft:removeBackground', async ({ tolerance }) => {
            GlobalStudioEngine.removeBackground(tolerance || 32);
            return { removed: true };
        });

        GlobalCommandBus.register('vectorcraft:generateSquircle', async ({ size, n, fill }) => {
            const svg = GlobalStudioEngine.generateSquircleSVG(size || 300, n || 68, fill || GlobalStudioEngine.brushColor);
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            await GlobalStudioEngine.loadImage(url);
            URL.revokeObjectURL(url);
            return { generated: true };
        });

        // System Diagnostic Ping
        GlobalCommandBus.register('system:ping', async ({ timestamp }) => {
            return { pong: true, serverTime: Date.now(), latencyMs: Math.max(0, Date.now() - (timestamp || Date.now())) };
        });

        // Global Agent Surfaces
        window.RaeenCommandBus = GlobalCommandBus;
        window.__RAEEN_AGENT_BUS__ = GlobalCommandBus;
        window.RaeenStudioEngine = GlobalStudioEngine;

        // External AI Agent & Model Context Protocol (MCP) Message Bridge
        window.addEventListener('message', async (event) => {
            if (event.data?.type === 'RAEEN_AGENT_COMMAND') {
                const res = await GlobalCommandBus.execute(
                    event.data.action,
                    event.data.payload,
                    { source: 'mcp' }
                );
                window.postMessage({ type: 'RAEEN_AGENT_RESPONSE', id: event.data.id, result: res }, '*');
            }
        });
    })();

    function initAmbientAudioUI() {
        const container = document.getElementById('ambient-audio-presets');
        if (!container) return;

        const updatePillActive = (activeSound) => {
            const pills = container.querySelectorAll('.ambient-sound-pill');
            pills.forEach(pill => {
                const s = pill.dataset.sound;
                if (!activeSound || activeSound === 'off') {
                    pill.classList.toggle('active', s === 'off');
                } else {
                    pill.classList.toggle('active', s === activeSound);
                }
            });
        };

        // Reflect current ambient sound immediately from engine/storage on tab load
        const initialSound = AmbientAudio.getActiveSound();
        updatePillActive(initialSound || 'off');

        container.addEventListener('click', (e) => {
            const pill = e.target.closest('.ambient-sound-pill');
            if (!pill || !pill.dataset.sound) return;
            const sound = pill.dataset.sound;
            if (sound === 'off') {
                AmbientAudio.stop();
                updatePillActive('off');
            } else {
                const isPlaying = AmbientAudio.play(sound);
                updatePillActive(isPlaying ? sound : 'off');
            }
        });

        window.addEventListener('raeen-ambient-change', (e) => {
            const sound = e.detail?.sound;
            updatePillActive(sound || 'off');
        });
    }

    function initCreativeStudioModalUI() {
        const modal = document.getElementById('creative-canvas-modal');
        const canvas = document.getElementById('studio-viewport-canvas');
        if (!modal || !canvas) return;

        let attached = false;
        const ensureCanvasAttached = () => {
            if (!attached) {
                GlobalStudioEngine.attachToCanvas(canvas);
                attached = true;
            }
        };

        window.openCreativeStudio = async (initialImageSrc) => {
            if (typeof window.ensureStudioLoaded === 'function') {
                await window.ensureStudioLoaded();
            }
            ensureCanvasAttached();
            modal.classList.remove('hidden');
            if (initialImageSrc) {
                try {
                    await GlobalStudioEngine.loadImage(initialImageSrc);
                } catch (e) {
                    console.error('Failed to load initial studio image:', e);
                }
            }
        };

        window.triggerScreenCapture = async () => {
            try {
                const chrome = window.chrome;
                if (!chrome?.runtime?.sendMessage) {
                    alert('Screen Snapper requires Chrome extension runtime context.');
                    return;
                }
                chrome.runtime.sendMessage({ action: 'capture_screen' }, async (response) => {
                    if (response && response.success && response.dataUrl) {
                        window.openCreativeStudio(response.dataUrl);
                    } else {
                        alert(response?.error || 'Unable to capture tab screen.');
                    }
                });
            } catch (err) {
                console.error('Screen capture error:', err);
            }
        };

        const closeBtn = document.getElementById('close-studio-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.add('hidden');
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        // Markup tools selector
        const toolBtns = modal.querySelectorAll('.studio-tool-btn');
        toolBtns.forEach(btn => {
            btn.onclick = () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                GlobalStudioEngine.activeTool = btn.dataset.tool || 'brush';
            };
        });

        // Color & Size
        const colorPicker = document.getElementById('studio-color-picker');
        if (colorPicker) {
            colorPicker.oninput = (e) => {
                GlobalStudioEngine.brushColor = e.target.value;
            };
        }

        const sizeSlider = document.getElementById('studio-size-slider');
        const sizeLabel = document.getElementById('studio-size-label');
        if (sizeSlider) {
            sizeSlider.oninput = (e) => {
                const val = parseInt(e.target.value, 10);
                GlobalStudioEngine.brushSize = val;
                if (sizeLabel) sizeLabel.textContent = `${val}px`;
            };
        }

        // Pixel Filters
        const filterBtns = modal.querySelectorAll('.studio-pill-btn[data-filter]');
        filterBtns.forEach(btn => {
            btn.onclick = () => {
                const filter = btn.dataset.filter;
                if (filter === 'remove_bg') {
                    GlobalStudioEngine.removeBackground(32);
                } else if (filter) {
                    GlobalStudioEngine.applyFilter(filter);
                }
            };
        });

        // History Actions
        const undoBtn = document.getElementById('studio-undo-btn');
        if (undoBtn) undoBtn.onclick = () => GlobalStudioEngine.undo();

        const redoBtn = document.getElementById('studio-redo-btn');
        if (redoBtn) redoBtn.onclick = () => GlobalStudioEngine.redo();

        const clearBtn = document.getElementById('studio-clear-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                GlobalStudioEngine.saveSnapshot();
                GlobalStudioEngine.getActiveLayer().clear();
                GlobalStudioEngine.render();
            };
        }

        // Vector Squircle
        const squircleBtn = document.getElementById('studio-squircle-btn');
        if (squircleBtn) {
            squircleBtn.onclick = async () => {
                const svg = GlobalStudioEngine.generateSquircleSVG(300, 68, GlobalStudioEngine.brushColor);
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                await GlobalStudioEngine.loadImage(url);
                URL.revokeObjectURL(url);
            };
        }

        // Clipboard Copy
        const copyBtn = document.getElementById('studio-copy-clipboard-btn');
        if (copyBtn) {
            copyBtn.onclick = async () => {
                const ok = await GlobalStudioEngine.copyToClipboard();
                if (ok) {
                    const originalHtml = copyBtn.innerHTML;
                    copyBtn.textContent = '✓ Copied PNG!';
                    setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
                } else {
                    alert('Clipboard write failed. Please check browser clipboard permissions.');
                }
            };
        }

        // Download
        const downloadBtn = document.getElementById('studio-download-btn');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                GlobalStudioEngine.download(`raeen_snap_${Date.now()}.png`);
            };
        }
    }

})();
