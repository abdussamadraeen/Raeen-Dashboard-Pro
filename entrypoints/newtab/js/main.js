import { StorageManager } from './storage.js';
import { state, defaultSettings, updateSettings, saveSettings } from './state.js';
import { dom } from './dom.js';
import { 
    applySettings, 
    syncSettingsUI, 
    updateTime, 
    loadBingGallery, 
    updateCards, 
    syncBackgroundOptions, 
    renderThemeLibrary 
} from './ui.js';
import { 
    renderNotesList, 
    openNoteEditor, 
    closeNoteEditor, 
    deleteCurrentNote, 
    saveCurrentNote, 
    updateCharCount 
} from './notes.js';
import { renderShortcuts, addShortcut } from './shortcuts.js';
import { setupSearch } from './search.js';
import { initFocusTimer } from './focus.js';
import { validateAndRepairSettings } from './schema.js';
import { escapeHTML, escapeAttribute, sanitizeURL } from './security.js';

(async function init() {
    // 1. Immediate UI Load (using defaults to prevent lag)
    applySettings();
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

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

                updateSettings(saved);
                if (saved.backgroundType) {
                    localStorage.setItem('raeen_bg_type', saved.backgroundType);
                    localStorage.setItem('raeen_bg_value', saved.backgroundValue || '');
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
            renderThemeLibrary();
            renderShortcuts();
            updateCards();
        } catch (e) {
            console.error("Storage initialization failed", e);
        }
    };

    await loadStorage();

    // 3. Feature setup
    setupSearch();
    initFocusTimer();

    // Event Listeners
    if (dom.settingsBtn) {
        dom.settingsBtn.onclick = () => {
            syncSettingsUI();
            dom.modalOverlay.classList.toggle('hidden');
        };
    }
    if (dom.closeBtn) dom.closeBtn.onclick = () => dom.modalOverlay.classList.add('hidden');

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
        dom.bgTypeSelect.oninput = (e) => {
            state.settings.backgroundType = e.target.value;
            if (e.target.value === 'bing') state.settings.backgroundValue = 'bing_latest_v2';
            commitSettings();
            syncBackgroundOptions();
            if (e.target.value === 'bing') loadBingGallery();
        };
    }

    bindVal(dom.canvasStyleSelect, 'canvasStyle');
    bindVal(dom.bgCustomUrl, 'backgroundValue', 'onchange');
    bindVal(dom.customSearchUrlInput, 'customSearchUrl', 'onchange');
    bindVal(dom.clockFormatSelect, 'clockFormat');

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
    bindToggle(dom.toggleDragDrop, 'enableDragAndDrop');

    bindRadio('theme_preference', 'themePreference');
    bindRadio('search_engine', 'searchEngine');
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

    bindVal(dom.bgColorPicker, 'backgroundValue', 'oninput', () => {
        state.settings.backgroundType = 'solid';
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = () => {
            state.settings.backgroundType = 'solid';
            state.settings.backgroundValue = swatch.dataset.color;
            commitSettings();
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
        if (!msg) return;

        // Verify the message is coming from our active background iframe to prevent tab cross-talk
        const iframe = dom.bgLayer ? dom.bgLayer.querySelector('iframe') : null;
        if (!iframe || event.source !== iframe.contentWindow) return;

        if (msg.action === 'iframe_navigated' && msg.title) {
            document.title = msg.title;
        }
        if (msg.action === 'close_dashboard_iframe') {
            try {
                const settings = await StorageManager.get('settings', 'main');
                if (settings) {
                    settings.backgroundType = 'solid';
                    settings.backgroundValue = '#0f0f17';
                    updateSettings(settings);
                    await saveSettings(settings);
                    localStorage.setItem('raeen_bg_type', settings.backgroundType);
                    localStorage.setItem('raeen_bg_value', settings.backgroundValue || '');
                }
                applySettings();
                syncSettingsUI();
                updateTime();
            } catch (err) {
                console.error("Failed to restore settings:", err);
            }
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
    (async function initCategoryDirectories() {
        const defaultDirectories = [
            {
                id: "preset-ai",
                name: "AI Hub",
                icon: "🤖",
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
                icon: "💼",
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
                icon: "💬",
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
                icon: "🛠️",
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
                icon: "🎮",
                visible: true,
                sites: [
                    { name: "YouTube", url: "https://youtube.com" },
                    { name: "Netflix", url: "https://netflix.com" },
                    { name: "Spotify", url: "https://spotify.com" },
                    { name: "Twitch", url: "https://twitch.tv" }
                ]
            }
        ];

        // Ensure default dashboard title matches
        try {
            const mainSettings = await StorageManager.get("settings", "main");
            if (mainSettings && (!mainSettings.dashboardTitle || mainSettings.dashboardTitle === "NewTab")) {
                mainSettings.dashboardTitle = "New Tab";
                await saveSettings(mainSettings, true);
                document.title = "New Tab";
            }
        } catch (err) {
            console.error("Failed to migrate title", err);
        }

        let directoriesData = await StorageManager.get("settings", "directories_data");
        if (!directoriesData) {
            directoriesData = {
                show: true,
                list: defaultDirectories
            };
            await StorageManager.set("settings", "directories_data", directoriesData);
        }

        let activeCategoryId = null;
        const getActiveCategory = () => {
            const visibleList = (directoriesData.list || []).filter(c => c.visible);
            if (visibleList.length === 0) return null;
            if (!activeCategoryId || !visibleList.some(c => c.id === activeCategoryId)) {
                activeCategoryId = visibleList[0].id;
            }
            return visibleList.find(c => c.id === activeCategoryId) || visibleList[0];
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
                background: rgba(0, 0, 0, 0.10);
                border-right: 1px solid var(--border);
                display: flex;
                flex-direction: column;
                padding: 12px 0;
                flex-shrink: 0;
            }
            [data-theme="light"] .directory-sidebar {
                background: rgba(255, 255, 255, 0.3);
            }
            .directory-sidebar-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 10px 16px;
                background: none;
                border: none;
                color: var(--text-secondary);
                font-family: inherit;
                font-size: 0.85rem;
                font-weight: 500;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
                border-left: 3px solid transparent;
            }
            .directory-sidebar-btn:hover {
                background: rgba(255, 255, 255, 0.04);
                color: var(--text-primary);
            }
            [data-theme="light"] .directory-sidebar-btn:hover {
                background: rgba(0, 0, 0, 0.03);
            }
            .directory-sidebar-btn.active {
                background: rgba(255, 255, 255, 0.08);
                color: var(--text-primary);
                border-left-color: var(--accent);
                font-weight: 600;
            }
            [data-theme="light"] .directory-sidebar-btn.active {
                background: rgba(0, 0, 0, 0.06);
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
                grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                gap: 12px;
                overflow-y: auto;
                max-height: 250px;
                padding: 4px;
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
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                color: var(--text-primary);
                text-decoration: none;
                font-size: 0.75rem;
                font-weight: 500;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                cursor: pointer;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .directory-card:hover {
                transform: translateY(-4px) scale(1.02);
                background: var(--glass-hover-bg);
                border-color: var(--accent);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15), 0 0 15px var(--accent-glow);
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
            }
            .directory-card.add-card:hover {
                opacity: 1;
                border-color: var(--accent);
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
            .directory-editor-item {
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
        document.head.appendChild(styleEl);

        // Inject HTML markup for the Directories widget
        const searchWidget = document.getElementById("search-widget");
        const dirWidget = document.createElement("section");
        dirWidget.id = "directory-widget";
        dirWidget.className = "directory-container hidden draggable-widget";
        dirWidget.setAttribute("draggable", "false");
        
        if (searchWidget) {
            searchWidget.parentNode.insertBefore(dirWidget, searchWidget.nextSibling);
        } else {
            const mainContainer = document.querySelector(".container");
            if (mainContainer) mainContainer.appendChild(dirWidget);
        }
        
        if (typeof window.applyWidgetLayout === "function") {
            window.applyWidgetLayout();
        }

        // Add settings tab button
        const sidebar = document.querySelector(".modal-sidebar");
        const tabBtn = document.createElement("button");
        tabBtn.className = "sidebar-tab";
        tabBtn.setAttribute("data-target", "tab-directories");
        tabBtn.innerHTML = `
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;opacity:0.6;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Directories
        `;
        if (sidebar) sidebar.appendChild(tabBtn);

        // Add settings tab pane
        const modalContent = document.querySelector("#settings-modal .modal-content");
        const pane = document.createElement("div");
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
                        <input type="text" id="new-cat-icon-input" class="text-input" placeholder="Emoji (e.g. 💰)" style="max-width: 80px; text-align: center;">
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
        if (modalContent) modalContent.appendChild(pane);

        // Add Site modal container for link adding
        const addSiteModal = document.createElement("div");
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

        // 4. Rendering Functions
        const saveDirectories = async () => {
            await StorageManager.set("settings", "directories_data", directoriesData);
            renderWidget();
            renderSettings();
        };

        const renderWidget = () => {
            if (!directoriesData.show) {
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
                        <span class="directory-sidebar-icon">${escapedIcon}</span>
                        <span>${escapedName}</span>
                    </button>
                `;
            });
            
            // Add Category button
            sidebarHTML += `
                <button class="directory-sidebar-btn" id="shortcut-add-cat-btn" style="margin-top:auto; opacity:0.5; border-top:1px solid var(--border);">
                    <span class="directory-sidebar-icon">➕</span>
                    <span>Add Folder</span>
                </button>
            `;
            sidebarHTML += `</div>`;

            let contentHTML = `<div class="directory-content">`;
            if (activeCat) {
                const escapedCatIcon = escapeHTML(activeCat.icon || '📁');
                const escapedCatName = escapeHTML(activeCat.name);
                contentHTML += `
                    <div class="directory-header">
                        <div class="directory-title-wrapper">
                            <span style="font-size:1.3rem;">${escapedCatIcon}</span>
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
                const escapedIcon = escapeHTML(c.icon || '📁');
                const escapedName = escapeHTML(c.name);
                const escapedCount = c.sites ? c.sites.length : 0;
                return `
                    <div class="directory-editor-item">
                        <div class="directory-editor-item-left">
                            <span style="font-size:1.1rem;">${escapedIcon}</span>
                            <strong>${escapedName}</strong>
                            <span style="font-size:0.75rem;opacity:0.6;">(${escapedCount} links)</span>
                        </div>
                        <div class="directory-editor-actions">
                            <label class="switch" style="width: 36px; height: 20px; margin-right: 10px;">
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
            showToggle.checked = directoriesData.show;
            showToggle.onchange = () => {
                directoriesData.show = showToggle.checked;
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

        // Render initially
        renderWidget();
        renderSettings();
    })();

    // ─── Free-Position Drag & Drop / Resize Widget System ───
    (function() {
        const defaultPositions = {
            "clock-widget": { left: "4%", top: "4%" },
            "card-date": { left: "4%", top: "22%" },
            "card-focus": { left: "4%", top: "42%" },
            "search-widget": { left: "30%", top: "6%" },
            "directory-widget": { left: "30%", top: "22%" },
            "notes-widget": { left: "70%", top: "22%" },
            "top-sites-widget": { left: "30%", top: "15%" }
        };

        const defaultSizes = {
            "clock-widget": { width: "auto", height: "auto" },
            "card-date": { width: "280px", height: "140px" },
            "card-focus": { width: "280px", height: "170px" },
            "search-widget": { width: "640px", height: "auto" },
            "directory-widget": { width: "640px", height: "380px" },
            "notes-widget": { width: "340px", height: "380px" },
            "top-sites-widget": { width: "640px", height: "auto" }
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

            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (!widget.id) return;
                const size = sizes[widget.id] || defaultSizes[widget.id];
                if (size) {
                    if (size.width) widget.style.width = size.width;
                    if (size.height) widget.style.height = size.height;
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

            document.querySelectorAll(".draggable-widget").forEach(widget => {
                if (!widget.id) return;
                const pos = positions[widget.id] || defaultPositions[widget.id];
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
            const nonResizableWidgets = ["clock-widget", "card-date", "card-focus"];
            activeWidgets.forEach(widget => {
                if (!widget.querySelector(".drag-handle")) {
                    const handle = document.createElement("div");
                    handle.className = "drag-handle";
                    handle.innerText = "⋮⋮";
                    widget.insertBefore(handle, widget.firstChild);
                }
                if (!nonResizableWidgets.includes(widget.id) && !widget.querySelector(".resize-handle")) {
                    const rHandle = document.createElement("div");
                    rHandle.className = "resize-handle";
                    widget.appendChild(rHandle);
                }
            });
        }

        let clampFrame = null;
        let clampSaveTimeout = null;

        // Perform layout clamping on window resize
        function clampWidgetsOnScreen() {
            clampFrame = null;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            document.querySelectorAll(".draggable-widget").forEach(widget => {
                const rect = widget.getBoundingClientRect();
                let leftPx = rect.left;
                let topPx = rect.top;
                
                leftPx = Math.max(0, Math.min(leftPx, viewportWidth - rect.width));
                topPx = Math.max(0, Math.min(topPx, viewportHeight - rect.height));
                
                widget.style.left = `${(leftPx / viewportWidth) * 100}%`;
                widget.style.top = `${(topPx / viewportHeight) * 100}%`;
            });

            clearTimeout(clampSaveTimeout);
            clampSaveTimeout = setTimeout(saveWidgetPositions, 180);
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
                    
                    const nonResizableWidgets = ["clock-widget", "card-date", "card-focus"];
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

})();
