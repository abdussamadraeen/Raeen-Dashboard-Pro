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

    if (toSave.backgroundType) {
        localStorage.setItem('raeen_bg_type', toSave.backgroundType);
        if (toSave.backgroundType !== 'brave' || toSave.backgroundValue !== 'brave_random') {
            localStorage.setItem('raeen_bg_value', toSave.backgroundValue || '');
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        Promise.resolve(chrome.storage.local.set({ 'raeen_settings': toSave }))
            .catch((error) => console.error('Failed to sync settings:', error));
    }

    // Collapse rapid updates while an IndexedDB write is already in progress.
    return queueSettingsWrite(cloneSettings(toSave));
}
