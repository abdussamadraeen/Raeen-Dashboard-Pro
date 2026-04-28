import { StorageManager } from './storage.js';
import { state, defaultSettings, updateSettings, saveSettings } from './state.js';
import { dom } from './dom.js';
import { applySettings, syncSettingsUI, updateTime, loadBingGallery, updateCards, syncBackgroundOptions, renderThemeLibrary } from './ui.js';
import { renderNotesList, openNoteEditor, closeNoteEditor, deleteCurrentNote, saveCurrentNote, updateCharCount } from './notes.js';

import { renderShortcuts, addShortcut } from './shortcuts.js';
import { setupSearch } from './search.js';
import { initFocusTimer } from './focus.js';

(async function init() {
    await StorageManager.init();
    const saved = await StorageManager.get('settings', 'main');
    if (saved) {
        updateSettings(saved);
    } else {
        const local = localStorage.getItem('abdus_dashboard_settings');
        if (local) {
            try {
                updateSettings(JSON.parse(local));
                await saveSettings(state.settings);
            } catch (e) {
                console.error("Error parsing settings from localStorage", e);
            }
        } else {
            // First run: persist default settings to chrome.storage for background services
            await saveSettings(state.settings);
        }
    }

    applySettings();
    updateTime();
    setInterval(updateTime, 1000);
    renderNotesList();
    renderThemeLibrary();
    renderShortcuts();
    updateCards();
    setupSearch();
    initFocusTimer();

    // Event Listeners
    if (dom.settingsBtn) dom.settingsBtn.onclick = () => {
        syncSettingsUI();
        dom.modalOverlay.classList.toggle('hidden');
    };
    if (dom.closeBtn) dom.closeBtn.onclick = () => dom.modalOverlay.classList.add('hidden');

    // Background Settings
    if (dom.bgTypeSelect) dom.bgTypeSelect.oninput = (e) => {
        state.settings.backgroundType = e.target.value;
        if (e.target.value === 'bing') state.settings.backgroundValue = 'bing_latest';
        saveSettings(state.settings);
        syncBackgroundOptions();
        if (e.target.value === 'bing') loadBingGallery();
        
        if (e.target.value === 'google_dashboard') {
            window.location.href = "https://www.google.com/webhp?authuser=1&zx=1777002508090&abdus_dashboard=true";
        } else if (e.target.value === 'bing_dashboard') {
            window.location.href = "https://www.bing.com/?pc=EE30&abdus_dashboard=true";
        }
    };
    if (dom.canvasStyleSelect) dom.canvasStyleSelect.oninput = (e) => {
        state.settings.canvasStyle = e.target.value;
        saveSettings(state.settings);
    };
    if (dom.bgCustomUrl) dom.bgCustomUrl.onchange = e => { state.settings.backgroundValue = e.target.value; saveSettings(state.settings); };
    if (dom.bgLocalFile) dom.bgLocalFile.onchange = async e => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await StorageManager.set('mediaStore', 'localBackground', { data: file, type: file.type, timestamp: Date.now() });
            state.settings.backgroundValue = 'local';
            state.settings.backgroundType = 'local';
            saveSettings(state.settings);
        }
    };

    // Appearance
    document.getElementsByName('theme_preference').forEach(radio => {
        radio.onchange = (e) => { state.settings.themePreference = e.target.value; saveSettings(state.settings); };
    });
    if (dom.showNoosphereToggle) dom.showNoosphereToggle.onchange = e => { state.settings.showNoosphereBar = e.target.checked; saveSettings(state.settings); };
    if (dom.showSettingsInImmersiveToggle) dom.showSettingsInImmersiveToggle.onchange = e => { state.settings.showSettingsButtonInImmersive = e.target.checked; saveSettings(state.settings); };
    if (dom.showMainUIToggle) dom.showMainUIToggle.onchange = e => { state.settings.showMainUI = e.target.checked; saveSettings(state.settings); };

    // Search
    if (dom.toggleSearch) dom.toggleSearch.onchange = e => { state.settings.showSearch = e.target.checked; saveSettings(state.settings); };
    document.getElementsByName('search_engine').forEach(radio => {
        radio.onchange = e => { state.settings.searchEngine = e.target.value; saveSettings(state.settings); };
    });
    if (dom.customSearchUrlInput) dom.customSearchUrlInput.onchange = e => { state.settings.customSearchUrl = e.target.value; saveSettings(state.settings); };

    // Top Sites
    if (dom.toggleTopSites) dom.toggleTopSites.onchange = e => { state.settings.showTopSites = e.target.checked; saveSettings(state.settings); renderShortcuts(); };
    document.getElementsByName('topsites_source').forEach(radio => {
        radio.onchange = e => { state.settings.topSitesSource = e.target.value; saveSettings(state.settings); renderShortcuts(); };
    });
    if (dom.addShortcutBtn) dom.addShortcutBtn.onclick = addShortcut;

    // Clock
    if (dom.toggleClock) dom.toggleClock.onchange = e => { state.settings.showClock = e.target.checked; saveSettings(state.settings); };
    if (dom.clockFormatSelect) dom.clockFormatSelect.oninput = e => { state.settings.clockFormat = e.target.value; saveSettings(state.settings); };

    // Cards
    if (dom.toggleCards) dom.toggleCards.onchange = e => { state.settings.showCards = e.target.checked; saveSettings(state.settings); };
    if (dom.toggleCardDate) dom.toggleCardDate.onchange = e => { state.settings.showCardDate = e.target.checked; saveSettings(state.settings); };
    if (dom.toggleCardFocus) dom.toggleCardFocus.onchange = e => { state.settings.showCardFocus = e.target.checked; saveSettings(state.settings); };
    if (dom.toggleCardNote) dom.toggleCardNote.onchange = e => { state.settings.showCardNote = e.target.checked; saveSettings(state.settings); };

    // Notes
    if (dom.addNoteBtn) dom.addNoteBtn.onclick = () => openNoteEditor();
    if (dom.noteBackBtn) dom.noteBackBtn.onclick = closeNoteEditor;
    if (dom.noteDeleteBtn) dom.noteDeleteBtn.onclick = deleteCurrentNote;

    if (dom.videoSoundBtn) {
        dom.videoSoundBtn.onclick = () => {
            const video = dom.bgLayer.querySelector('video');
            if (video) {
                state.settings.videoMuted = !state.settings.videoMuted;
                video.muted = state.settings.videoMuted;
                dom.videoSoundBtn.classList.toggle('muted', state.settings.videoMuted);
                const svg = dom.videoSoundBtn.querySelector('svg');
                if (svg) {
                    svg.innerHTML = state.settings.videoMuted ? 
                        '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.05-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l7.73 7.73H7v6h4l5 5v-6.73l4.25 4.25c.67-.64 1.24-1.37 1.7-2.18L5.73 3zM12 4L9.27 6.73 12 9.46V4z"/>' : 
                        '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
                }
                saveSettings(state.settings, true);
            }
        };
    }

    let saveTimeout;
    const autoSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCurrentNote, 800);
    };
    if (dom.noteEditorTitle) dom.noteEditorTitle.oninput = autoSave;
    if (dom.noteEditorBody) dom.noteEditorBody.oninput = () => { autoSave(); updateCharCount(); };

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

    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'close_dashboard_iframe') {
            state.settings.backgroundType = 'solid';
            state.settings.backgroundValue = '#0f0f17';
            saveSettings(state.settings);
            dom.modalOverlay.classList.remove('hidden');
            syncSettingsUI();
        }
    });
})();
