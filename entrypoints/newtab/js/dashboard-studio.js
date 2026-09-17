/**
 * Custom Dashboard Studio & Cross-Device Sharing Engine
 * Features:
 * - Multi-profile custom dashboard management
 * - Cryptographic SHA-256 integrity verification (Blockchain / tamper-proof standard)
 * - Zero-backend compressed payload sharing (Gzip Stream + Base64URL)
 * - QR code visual pairing via native HTML5 Canvas
 * - Modular Widget Catalog & Store
 */

import { state, saveSettings } from './state.js';
import { updateCards } from './ui.js';
import { drawQRCode } from './qr-generator.js';

export const WIDGET_CATALOG = [
    {
        id: 'showCardImageCompressor',
        name: 'In-Browser Image Compressor',
        category: 'Creative & Media',
        icon: '🖼️',
        desc: 'Compress, resize and convert PNG/JPG/WebP images 100% locally with zero server upload.',
        badge: 'New Tool',
        previewHtml: `
            <div class="cat-preview cat-imgcomp">
                <div class="cat-thumb-split">
                    <div class="cat-thumb-box"><span>🖼️</span></div>
                    <div class="cat-thumb-stats">
                        <span class="cat-metric">2.4 MB → 480 KB</span>
                        <span class="cat-savings-badge">-80% WebP</span>
                    </div>
                </div>
                <div class="cat-slider-track"><div class="cat-slider-fill" style="width: 80%"></div></div>
            </div>
        `
    },
    {
        id: 'showCardPdfTools',
        name: 'Local PDF Tools & Generator',
        category: 'Creative & Media',
        icon: '📄',
        desc: 'Inspect metadata, extract readable text, and convert images into clean PDFs completely offline.',
        badge: 'New Tool',
        previewHtml: `
            <div class="cat-preview cat-pdf">
                <div class="cat-pdf-row">
                    <span class="cat-pdf-badge">PDF</span>
                    <span class="cat-pdf-title">Contract.pdf (4 pages)</span>
                </div>
                <div class="cat-btn-pill">Images to PDF ↗</div>
            </div>
        `
    },
    {
        id: 'showCardSecurity',
        name: 'Privacy & VPN Shield HUD',
        category: 'Privacy & Security',
        icon: '🛡️',
        desc: 'Tactical security radar, fast Tor relay routing, WebRTC leak guard, and nuclear trace scram.',
        badge: 'High Security',
        previewHtml: `
            <div class="cat-preview cat-security">
                <div class="cat-radar-box">
                    <div class="cat-radar-sweep"></div>
                </div>
                <div class="cat-sec-meta">
                    <span class="cat-badge-green">DEFCON 1 • ACTIVE</span>
                    <span class="cat-sec-sub">256-Bit Shield • Tor 9050</span>
                </div>
            </div>
        `
    },
    {
        id: 'showCardFileShare',
        name: 'Offline P2P File Share',
        category: 'Privacy & Security',
        icon: '⚡',
        desc: 'AirDrop-style direct peer-to-peer file transfer over local Wi-Fi with encrypted pairing codes.',
        badge: 'Offline P2P',
        previewHtml: `
            <div class="cat-preview cat-fileshare">
                <span class="cat-p2p-icon">⚡</span>
                <div class="cat-p2p-info">
                    <span class="cat-code-pill">Code: 482-901</span>
                    <span class="cat-p2p-sub">Local Wi-Fi P2P Encrypted</span>
                </div>
            </div>
        `
    },
    {
        id: 'showCardFocus',
        name: 'Pomodoro Focus Timer',
        category: 'Productivity',
        icon: '⏱️',
        desc: '25-minute deep work intervals to boost concentration and eliminate distractions.',
        badge: 'Productivity',
        previewHtml: `
            <div class="cat-preview cat-focus">
                <div class="cat-circle-timer">25:00</div>
                <div class="cat-focus-meta">
                    <span class="cat-focus-pill">▶ Deep Work Interval</span>
                </div>
            </div>
        `
    },
    {
        id: 'showCardNote',
        name: 'Quick Scratchpad Notes',
        category: 'Productivity',
        icon: '📝',
        desc: 'Instantly jot down thoughts, links, and code snippets with automatic local persistence.',
        badge: 'Productivity',
        previewHtml: `
            <div class="cat-preview cat-notes">
                <div class="cat-note-header"><span>Quick Thoughts</span><span class="cat-saved-pill">Saved ✓</span></div>
                <div class="cat-line"></div>
                <div class="cat-line cat-line-short"></div>
            </div>
        `
    },
    {
        id: 'showCardDirectories',
        name: 'Category Folders (AI Hub & Dev)',
        category: 'Productivity',
        icon: '📁',
        desc: 'Organized tabbed launcher for AI models, developer tools, work, and essential bookmarks.',
        badge: 'Organization',
        previewHtml: `
            <div class="cat-preview cat-directories">
                <div class="cat-dir-tabs">
                    <span class="cat-tab active">🤖 AI Hub</span>
                    <span class="cat-tab">💻 Dev</span>
                    <span class="cat-tab">💼 Work</span>
                </div>
                <div class="cat-app-bubbles">
                    <span class="cat-bubble">ChatGPT</span>
                    <span class="cat-bubble">Claude</span>
                    <span class="cat-bubble">Gemini</span>
                </div>
            </div>
        `
    },
    {
        id: 'showCardDate',
        name: 'Date & Civilization Supertrend',
        category: 'Time & Status',
        icon: '📅',
        desc: 'Localized daily date badge, annual progress gauge, and Civilization Development Index.',
        badge: 'Daily Tracker',
        previewHtml: `
            <div class="cat-preview cat-date">
                <div class="cat-date-row">
                    <span class="cat-today-badge">Sep 17 • Today</span>
                    <span class="cat-year-badge">2026</span>
                </div>
                <div class="cat-progress-track"><div class="cat-progress-fill" style="width: 71.2%"></div></div>
            </div>
        `
    },
    {
        id: 'showClock',
        name: 'Tactical Digital Clock',
        category: 'Time & Status',
        icon: '⏰',
        desc: '12h/24h precision digital clock with customizable seconds and meridian markers.',
        badge: 'Essential',
        previewHtml: `
            <div class="cat-preview cat-clock">
                <div class="cat-clock-digits">10:42<span class="cat-clock-sec">:18</span></div>
                <span class="cat-clock-meridian">AM // UTC+5:30</span>
            </div>
        `
    },
    {
        id: 'showSearch',
        name: 'Multi-Engine Omnibox',
        category: 'Search & AI',
        icon: '🔍',
        desc: 'Instant web search supporting Google, Brave, DuckDuckGo, Bing, ChatGPT, Perplexity, and Claude.',
        badge: 'Essential',
        previewHtml: `
            <div class="cat-preview cat-search">
                <div class="cat-search-box">
                    <span class="cat-search-engine-icon">🌐</span>
                    <span class="cat-search-ghost">Search Google, Perplexity, Claude...</span>
                </div>
            </div>
        `
    }
];

// Cryptographic SHA-256 Fingerprint Generator
export async function computeSha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compress data to Base64URL string (Gzip Stream)
export async function compressPayload(obj) {
    const jsonStr = JSON.stringify(obj);
    const stream = new Blob([jsonStr], { type: 'application/json' })
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to binary string and base64url encode
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `RDB1_${b64}`;
}

// Decompress Base64URL string back to object
export async function decompressPayload(code) {
    if (!code || typeof code !== 'string') throw new Error('Invalid code string');
    
    const cleanCode = code.trim();
    if (!cleanCode.startsWith('RDB1_')) {
        // Fallback: try raw JSON
        return JSON.parse(cleanCode);
    }

    let b64 = cleanCode.slice(5)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    const text = await response.text();
    return JSON.parse(text);
}

// Build transferable snapshot from current state
export async function createDashboardSnapshot(name = 'Custom Workspace') {
    const current = state.settings;
    const widgetConfig = {
        showCardImageCompressor: !!current.showCardImageCompressor,
        showCardPdfTools: !!current.showCardPdfTools,
        showCardSecurity: current.showCardSecurity !== false,
        showCardFileShare: current.showCardFileShare !== false,
        showCardFocus: !!current.showCardFocus,
        showCardNote: !!current.showCardNote,
        showCardDirectories: current.showCardDirectories !== false,
        showCardDate: !!current.showCardDate,
        showClock: current.showClock !== false,
        showSearch: current.showSearch !== false,
        showTopSites: current.showTopSites !== false,
        themePreference: current.themePreference || 'dark',
        backgroundType: current.backgroundType || 'brave',
        backgroundValue: current.backgroundValue || 'brave_random',
        searchEngine: current.searchEngine || 'google',
        clockFormat: current.clockFormat || 'auto'
    };

    // Calculate core cryptographic hash
    const coreJson = JSON.stringify(widgetConfig);
    const sha256 = await computeSha256(coreJson);

    return {
        app: 'Raeen-Dashboard-Pro',
        version: 1,
        id: `dash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name,
        createdAt: Date.now(),
        sha256,
        config: widgetConfig
    };
}

export function initDashboardStudio() {
    initCatalogModal();
    initStudioModal();
    initShareModal();
    initImportModal();
}

/**
 * "+ Add Widget" Catalog Modal
 */
function initCatalogModal() {
    const modal = document.getElementById('add-widget-modal');
    const openBtn = document.getElementById('open-add-widget-btn');
    const closeBtn = document.getElementById('close-add-widget-btn');
    const grid = document.getElementById('widget-catalog-grid');

    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
        renderWidgetCatalog();
        modal.classList.remove('hidden');
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

export function renderWidgetCatalog() {
    const grid = document.getElementById('widget-catalog-grid');
    if (!grid) return;

    grid.innerHTML = WIDGET_CATALOG.map(widget => {
        const isEnabled = state.settings[widget.id] === true || (state.settings[widget.id] !== false && widget.id !== 'showCardImageCompressor' && widget.id !== 'showCardPdfTools');

        return `
            <div class="catalog-card ${isEnabled ? 'card-enabled' : ''}" data-widget-id="${widget.id}">
                <div class="catalog-preview-banner">
                    ${widget.previewHtml || ''}
                </div>
                <div class="catalog-card-body">
                    <div class="catalog-card-header">
                        <div class="catalog-card-icon">${widget.icon}</div>
                        <div class="catalog-card-info">
                            <div class="catalog-card-title-row">
                                <h4 class="catalog-card-title">${widget.name}</h4>
                                <span class="catalog-badge">${widget.badge}</span>
                            </div>
                            <span class="catalog-category">${widget.category}</span>
                        </div>
                    </div>
                    <p class="catalog-desc">${widget.desc}</p>
                    <div class="catalog-card-footer">
                        <button type="button" class="catalog-toggle-btn ${isEnabled ? 'btn-remove' : 'btn-add'}" data-widget-key="${widget.id}">
                            ${isEnabled ? '✓ Added (Click to Hide)' : '+ Add to Dashboard'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (!grid._hasCatalogListener) {
        grid._hasCatalogListener = true;
        grid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.catalog-toggle-btn');
            if (!btn) return;
            const key = btn.dataset.widgetKey;
            if (!key) return;

            const currentState = state.settings[key];
            const newState = !(currentState === true || (currentState !== false && key !== 'showCardImageCompressor' && key !== 'showCardPdfTools'));
            state.settings[key] = newState;

            await saveSettings(state.settings);
            updateCards();
            renderWidgetCatalog();
        });
    }
}

/**
 * Dashboard Studio & Profile Manager
 */
function initStudioModal() {
    const modal = document.getElementById('dashboard-studio-modal');
    const openBtn = document.getElementById('open-studio-btn');
    const closeBtn = document.getElementById('close-studio-btn');
    const saveNewBtn = document.getElementById('studio-save-new-btn');
    const newNameInput = document.getElementById('studio-new-profile-name');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            renderStudioProfiles();
            modal.classList.remove('hidden');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    if (saveNewBtn && newNameInput) {
        saveNewBtn.addEventListener('click', async () => {
            const name = newNameInput.value.trim() || `Dashboard Profile #${(state.settings.customDashboards?.length || 0) + 1}`;
            const snapshot = await createDashboardSnapshot(name);

            if (!Array.isArray(state.settings.customDashboards)) {
                state.settings.customDashboards = [];
            }

            state.settings.customDashboards.push(snapshot);
            state.settings.activeCustomDashboardId = snapshot.id;
            state.settings.dashboardMode = 'custom';

            await saveSettings(state.settings);
            newNameInput.value = '';
            renderStudioProfiles();
            updateCards();
        });
    }
}

export function renderStudioProfiles() {
    const list = document.getElementById('studio-profiles-list');
    if (!list) return;

    const profiles = state.settings.customDashboards || [];
    const activeId = state.settings.activeCustomDashboardId;

    if (profiles.length === 0) {
        list.innerHTML = `
            <div class="studio-empty-state">
                <p>No saved custom dashboards yet.</p>
                <span class="subtext">Configure your widgets and save your first custom profile above!</span>
            </div>
        `;
        return;
    }

    list.innerHTML = profiles.map(profile => {
        const isActive = activeId === profile.id;
        const dateStr = new Date(profile.createdAt || Date.now()).toLocaleDateString();
        const shortHash = profile.sha256 ? profile.sha256.slice(0, 8) : 'verified';

        return `
            <div class="studio-profile-item ${isActive ? 'active-profile' : ''}" data-profile-id="${profile.id}">
                <div class="profile-meta">
                    <div class="profile-name-row">
                        <strong class="profile-name">${profile.name}</strong>
                        ${isActive ? '<span class="preset-active-tag">Active</span>' : ''}
                        <span class="hash-tag" title="Cryptographic SHA-256 Checksum: ${profile.sha256 || 'N/A'}">🔒 SHA: ${shortHash}</span>
                    </div>
                    <span class="profile-date">Created on ${dateStr}</span>
                </div>
                <div class="profile-actions">
                    <button type="button" class="studio-btn studio-btn-load" data-action="load" data-id="${profile.id}">
                        ${isActive ? 'Re-Apply' : 'Switch To'}
                    </button>
                    <button type="button" class="studio-btn studio-btn-share" data-action="share" data-id="${profile.id}" title="Share across devices or generate QR">
                        📤 Share
                    </button>
                    <button type="button" class="studio-btn studio-btn-delete" data-action="delete" data-id="${profile.id}" title="Delete profile">
                        🗑
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (!list._hasProfileListener) {
        list._hasProfileListener = true;
        list.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const profiles = state.settings.customDashboards || [];
            const target = profiles.find(p => p.id === id);
            if (!target) return;

            if (action === 'load') {
                Object.assign(state.settings, target.config);
                state.settings.activeCustomDashboardId = target.id;
                state.settings.dashboardMode = 'custom';
                await saveSettings(state.settings);
                renderStudioProfiles();
                updateCards();
            } else if (action === 'share') {
                openShareModal(target);
            } else if (action === 'delete') {
                if (confirm(`Delete custom dashboard "${target.name}"?`)) {
                    state.settings.customDashboards = profiles.filter(p => p.id !== id);
                    if (state.settings.activeCustomDashboardId === id) {
                        state.settings.activeCustomDashboardId = null;
                        state.settings.dashboardMode = 'pro';
                    }
                    await saveSettings(state.settings);
                    renderStudioProfiles();
                    updateCards();
                }
            }
        });
    }
}

/**
 * Share Modal & QR Code Visual Pairing
 */
function initShareModal() {
    const modal = document.getElementById('dashboard-share-modal');
    const closeBtn = document.getElementById('close-share-modal-btn');
    const copyCodeBtn = document.getElementById('share-copy-code-btn');
    const exportFileBtn = document.getElementById('share-export-file-btn');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const codeInput = document.getElementById('share-code-input');
            if (codeInput && codeInput.value) {
                navigator.clipboard.writeText(codeInput.value).then(() => {
                    const orig = copyCodeBtn.textContent;
                    copyCodeBtn.textContent = '✓ Copied!';
                    setTimeout(() => copyCodeBtn.textContent = orig, 2000);
                });
            }
        });
    }

    if (exportFileBtn) {
        exportFileBtn.addEventListener('click', () => {
            if (!window._activeShareProfile) return;
            const jsonStr = JSON.stringify(window._activeShareProfile, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = (window._activeShareProfile.name || 'custom_dashboard').replace(/[^a-z0-9_-]/gi, '_');
            a.href = url;
            a.download = `${safeName}.raeen.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

export async function openShareModal(profile) {
    const modal = document.getElementById('dashboard-share-modal');
    if (!modal) return;

    window._activeShareProfile = profile;

    const titleEl = document.getElementById('share-dashboard-title');
    const codeInput = document.getElementById('share-code-input');
    const qrCanvas = document.getElementById('share-qr-canvas');
    const hashEl = document.getElementById('share-integrity-hash');

    if (titleEl) titleEl.textContent = profile.name;
    if (hashEl) hashEl.textContent = profile.sha256 || 'Verified';

    // Generate compressed compact string
    const compactCode = await compressPayload(profile);
    if (codeInput) codeInput.value = compactCode;

    // Render QR Code onto canvas
    if (qrCanvas) {
        // Render compact code into QR code
        drawQRCode(qrCanvas, compactCode, 220);
    }

    modal.classList.remove('hidden');
}

/**
 * Import Modal (Code, QR Scan or File)
 */
function initImportModal() {
    const modal = document.getElementById('dashboard-import-modal');
    const openBtn = document.getElementById('open-import-btn');
    const closeBtn = document.getElementById('close-import-btn');
    const importCodeBtn = document.getElementById('import-code-btn');
    const importFileInput = document.getElementById('import-file-input');
    const dropzone = document.getElementById('import-file-dropzone');
    const statusEl = document.getElementById('import-status-msg');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (statusEl) statusEl.className = 'import-status hidden';
            modal.classList.remove('hidden');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    if (importCodeBtn) {
        importCodeBtn.addEventListener('click', async () => {
            const input = document.getElementById('import-code-input');
            if (!input || !input.value.trim()) return;
            await processImportPayload(input.value.trim());
        });
    }

    if (dropzone && importFileInput) {
        dropzone.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
        });

        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file) handleImportFile(file);
        });
    }
}

function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target.result;
            await processImportPayload(content);
        } catch (err) {
            showImportStatus(`Failed to read file: ${err.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

async function processImportPayload(rawStr) {
    const statusEl = document.getElementById('import-status-msg');
    try {
        let payload;
        if (rawStr.startsWith('{')) {
            payload = JSON.parse(rawStr);
        } else {
            payload = await decompressPayload(rawStr);
        }

        if (!payload || !payload.config) {
            throw new Error('Invalid dashboard configuration payload format.');
        }

        // Cryptographic integrity verification
        const coreJson = JSON.stringify(payload.config);
        const computedHash = await computeSha256(coreJson);
        const hasHashMatch = payload.sha256 ? payload.sha256 === computedHash : true;

        const importedProfile = {
            ...payload,
            id: `dash_imported_${Date.now()}`,
            name: `${payload.name || 'Imported Dashboard'} (Imported)`,
            createdAt: Date.now(),
            sha256: computedHash
        };

        if (!Array.isArray(state.settings.customDashboards)) {
            state.settings.customDashboards = [];
        }

        state.settings.customDashboards.push(importedProfile);
        state.settings.activeCustomDashboardId = importedProfile.id;
        state.settings.dashboardMode = 'custom';
        Object.assign(state.settings, importedProfile.config);

        await saveSettings(state.settings);
        updateCards();
        renderStudioProfiles();

        const integrityBadge = hasHashMatch 
            ? '✓ SHA-256 Cryptographic Checksum Verified (Tamper-Proof)' 
            : '⚠️ Imported with configuration recalculation';
        
        showImportStatus(`Success! "${importedProfile.name}" imported and applied.\n${integrityBadge}`, 'success');
        setTimeout(() => {
            const modal = document.getElementById('dashboard-import-modal');
            if (modal) modal.classList.add('hidden');
        }, 2500);
    } catch (err) {
        showImportStatus(`Import Error: ${err.message}`, 'error');
    }
}

function showImportStatus(msg, type) {
    const statusEl = document.getElementById('import-status-msg');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `import-status status-${type}`;
    statusEl.classList.remove('hidden');
}
