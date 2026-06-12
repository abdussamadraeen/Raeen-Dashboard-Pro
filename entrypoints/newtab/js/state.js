import { StorageManager } from './storage.js';
import { applySettings } from './ui.js';

export const defaultSettings = {
    dashboardTitle: 'New Tab',
    themePreference: 'dark',
    backgroundType: 'solid',
    backgroundValue: '#000000',
    showSearch: true,
    searchEngine: 'google',
    showTopSites: true,
    topSitesSource: 'favorites',
    shortcuts: [], // Start empty as requested
    googleApps: [
        { name: 'Search', url: 'https://google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png' },
        { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_96dp.png' }
    ],
    msApps: [
        { name: 'Office', url: 'https://www.office.com', icon: 'https://www.office.com/favicon.ico' },
        { name: 'Outlook', url: 'https://outlook.live.com', icon: 'https://www.office.com/favicon.ico' }
    ],
    aiApps: [
        { name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'https://chatgpt.com/favicon.ico' },
        { name: 'Gemini', url: 'https://gemini.google.com', icon: 'https://www.gstatic.com/lamda/images/favicon_v1_150160d1398865304d0c.svg' },
        { name: 'Claude', url: 'https://claude.ai', icon: 'https://www.google.com/s2/favicons?sz=64&domain=claude.ai' }
    ],
    customApps: [],
    showClock: true, 
    clockFormat: 'auto',
    showCards: true, 
    showCardDate: true, 
    showCardFocus: true, 
    showCardNote: true,
    showNoosphereBar: true, 
    showMainUI: true, 
    showSettingsButtonInImmersive: true, 
    customSearchUrl: 'https://www.google.com/search?q=%s',
    videoMuted: true,
    canvasStyle: 'neural',
    enableDragAndDrop: true
};

// Global state object
export const state = {
    settings: { ...defaultSettings }
};

let pendingSettings = null;
let settingsWriter = null;

export function updateSettings(newSettings) {
    state.settings = { ...state.settings, ...newSettings };
}

function cloneSettings(settings) {
    if (typeof structuredClone === 'function') {
        return structuredClone(settings);
    }
    return JSON.parse(JSON.stringify(settings));
}

function queueSettingsWrite(settings) {
    pendingSettings = settings;

    if (!settingsWriter) {
        settingsWriter = (async () => {
            while (pendingSettings) {
                const nextSettings = pendingSettings;
                pendingSettings = null;

                try {
                    await StorageManager.set('settings', 'main', nextSettings);
                } catch (error) {
                    console.error('Failed to persist settings:', error);
                }
            }
        })().finally(() => {
            settingsWriter = null;
        });
    }

    return settingsWriter;
}

export function saveSettings(settingsObj, noApply = false) {
    const toSave = settingsObj || state.settings;

    // Keep visual updates and the synchronous preload cache off the IDB path.
    if (!noApply) applySettings();

    if (toSave.backgroundType) {
        localStorage.setItem('raeen_bg_type', toSave.backgroundType);
        localStorage.setItem('raeen_bg_value', toSave.backgroundValue || '');
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        Promise.resolve(chrome.storage.local.set({ 'raeen_settings': toSave }))
            .catch((error) => console.error('Failed to sync settings:', error));
    }

    // Collapse rapid updates while an IndexedDB write is already in progress.
    return queueSettingsWrite(cloneSettings(toSave));
}
