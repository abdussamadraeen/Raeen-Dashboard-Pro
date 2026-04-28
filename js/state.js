import { StorageManager } from './storage.js';
import { applySettings } from './ui.js';

export const defaultSettings = {
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
        { name: 'Claude', url: 'https://claude.ai', icon: 'https://claude.ai/favicon.ico' }
    ],
    customApps: [],
    showClock: true, clockFormat: 'auto',
    showCards: true, showCardDate: true, showCardFocus: true, showCardNote: true,
    showNoosphereBar: true, showMainUI: true, showSettingsButtonInImmersive: true, customSearchUrl: 'https://www.google.com/search?q=%s',
    videoMuted: true,
    canvasStyle: 'neural'
};

// Global state object
export const state = {
    settings: { ...defaultSettings }
};

export function updateSettings(newSettings) {
    state.settings = { ...state.settings, ...newSettings };
}

export async function saveSettings(settingsObj, noApply = false) {
    const toSave = settingsObj || state.settings;
    await StorageManager.set('settings', 'main', toSave);
    chrome.storage.local.set({ 'abdus_settings': toSave });
    
    // Instant sync for FOUC prevention
    if (toSave.backgroundType) {
        localStorage.setItem('abdus_bg_type', toSave.backgroundType);
    }
    
    if (!noApply) applySettings();
}
