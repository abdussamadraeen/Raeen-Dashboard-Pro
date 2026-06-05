export const DEFAULT_SETTINGS = {
    backgroundType: "solid",
    backgroundValue: "#111111",
    canvasStyle: "neural",
    themePreference: "dark",
    showNoosphereBar: true,
    showSettingsButtonInImmersive: true,
    showMainUI: true,
    showSearch: true,
    searchEngine: "google",
    customSearchUrl: "",
    showTopSites: true,
    topSitesSource: "browser",
    showClock: true,
    clockFormat: "auto",
    showCards: true,
    showCardDate: true,
    showCardFocus: true,
    showCardNote: true,
    videoMuted: true,
    dashboardTitle: "New Tab",
    shortcuts: []
};

/**
 * Validates and repairs the settings object.
 * Returns a guaranteed safe settings object.
 */
export function validateAndRepairSettings(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        console.warn("Invalid settings data, returning defaults.");
        return { ...DEFAULT_SETTINGS };
    }

    const safeSettings = {};
    
    // Iterate over default settings and validate/repair each key
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const expectedType = Array.isArray(DEFAULT_SETTINGS[key]) ? 'array' : typeof DEFAULT_SETTINGS[key];
        let val = data[key];

        // Type checking and recovery
        if (expectedType === 'array') {
            safeSettings[key] = Array.isArray(val) ? val : [...DEFAULT_SETTINGS[key]];
        } else if (expectedType === 'boolean') {
            safeSettings[key] = typeof val === 'boolean' ? val : DEFAULT_SETTINGS[key];
        } else if (expectedType === 'string') {
            safeSettings[key] = typeof val === 'string' ? val : DEFAULT_SETTINGS[key];
        } else if (expectedType === 'number') {
            safeSettings[key] = typeof val === 'number' ? val : DEFAULT_SETTINGS[key];
        } else {
            safeSettings[key] = val !== undefined ? val : DEFAULT_SETTINGS[key];
        }
    }

    // Specific field sanitization
    const validSearchEngines = ["google", "duckduckgo", "bing", "brave", "chatgpt", "perplexity", "custom_engine"];
    if (!validSearchEngines.includes(safeSettings.searchEngine)) {
        safeSettings.searchEngine = "google";
    }

    const validBgTypes = ["solid", "preset", "custom", "bing", "local", "canvas", "google_dashboard", "bing_dashboard"];
    if (!validBgTypes.includes(safeSettings.backgroundType)) {
        safeSettings.backgroundType = "solid";
        safeSettings.backgroundValue = "#111111";
    }

    return safeSettings;
}
