import { StorageManager } from './storage.js';
import { applySettings } from './ui.js';

import { DEFAULT_SETTINGS } from './schema.js';

export const defaultSettings = DEFAULT_SETTINGS;

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

    if (toSave.dashboardMode) {
        localStorage.setItem('app_dashboard_mode', toSave.dashboardMode);
    }

    if (toSave.backgroundType) {
        localStorage.setItem('app_bg_type', toSave.backgroundType);
        localStorage.setItem('raeen_bg_type', toSave.backgroundType);
        const isRandom = toSave.backgroundValue === 'curated_random' || toSave.backgroundValue === 'brave_random';
        if (toSave.backgroundType !== 'curated' && toSave.backgroundType !== 'brave' || !isRandom) {
            localStorage.setItem('app_bg_value', toSave.backgroundValue || '');
            localStorage.setItem('raeen_bg_value', toSave.backgroundValue || '');
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        Promise.resolve(chrome.storage.local.set({ 'dashboard_settings': toSave, 'raeen_settings': toSave }))
            .catch((error) => console.error('Failed to sync settings:', error));
    }

    // Collapse rapid updates while an IndexedDB write is already in progress.
    return queueSettingsWrite(cloneSettings(toSave));
}

// Sync settings across tabs
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        const settingsChange = changes.dashboard_settings || changes.raeen_settings;
        if (areaName === 'local' && settingsChange && settingsChange.newValue) {
            updateSettings(settingsChange.newValue);
            applySettings();
        }
    });
}
