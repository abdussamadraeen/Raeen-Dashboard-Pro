import { StorageManager } from './storage.js';
import { applySettings } from './ui.js';

export const defaultSettings = {
    themePreference: 'dark',
    backgroundType: 'canvas',
    backgroundValue: 'neural',
    canvasStyle: 'neural',
    showSearch: true,
    searchEngine: 'google',
    showTopSites: true,
    topSitesSource: 'favorites',
    shortcuts: [
        { name: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
        { name: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/favicon.ico' }
    ],
    googleApps: [
        { name: 'Search', url: 'https://google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png' },
        { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_96dp.png' }
    ],
    msApps: [], aiApps: [], customApps: [],
    showClock: true, clockFormat: 'auto',
    showCards: false, showCardDate: true, showCardFocus: true, showCardNote: true,
    showNoosphereBar: true, showMainUI: true, showSettingsButtonInImmersive: true, customSearchUrl: 'https://www.google.com/search?q=%s',
    videoMuted: true
};

// Global state object
export const state = {
    settings: { ...defaultSettings }
};

export function updateSettings(newSettings) {
    state.settings = { ...state.settings, ...newSettings };
}

export async function saveSettings(settingsObj, noApply = false) {
    await StorageManager.set('settings', 'main', settingsObj || state.settings);
    if (!noApply) applySettings();
}
