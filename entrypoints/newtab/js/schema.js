export const DEFAULT_SETTINGS = {
    dashboardTitle: 'New Tab',
    themePreference: 'dark',
    backgroundType: 'solid',
    backgroundValue: '#000000',
    showSearch: true,
    searchEngine: 'google',
    showTopSites: true,
    topSitesSource: 'favorites',
    shortcuts: [],
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

export function validateAndRepairSettings(settingsObj) {
    if (!settingsObj || typeof settingsObj !== 'object' || Array.isArray(settingsObj)) {
        console.warn("Invalid settings data, returning defaults.");
        return { ...DEFAULT_SETTINGS };
    }

    const repaired = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const expectedType = Array.isArray(DEFAULT_SETTINGS[key]) ? 'array' : typeof DEFAULT_SETTINGS[key];
        const val = settingsObj[key];

        if (expectedType === 'array') {
            repaired[key] = Array.isArray(val) ? val : [...DEFAULT_SETTINGS[key]];
        } else if (expectedType === 'boolean') {
            repaired[key] = typeof val === 'boolean' ? val : DEFAULT_SETTINGS[key];
        } else if (expectedType === 'string') {
            repaired[key] = typeof val === 'string' ? val : DEFAULT_SETTINGS[key];
        } else if (expectedType === 'number') {
            repaired[key] = typeof val === 'number' ? val : DEFAULT_SETTINGS[key];
        } else {
            repaired[key] = val !== undefined ? val : DEFAULT_SETTINGS[key];
        }
    }

    // Safety checks for enum validations
    const validEngines = ["google", "duckduckgo", "bing", "brave", "chatgpt", "perplexity", "claude", "robot_ai", "custom_engine"];
    if (!validEngines.includes(repaired.searchEngine)) {
        repaired.searchEngine = "google";
    }

    const validBgTypes = ["solid", "preset", "custom", "bing", "local", "canvas", "google_dashboard", "bing_dashboard"];
    if (!validBgTypes.includes(repaired.backgroundType)) {
        repaired.backgroundType = "solid";
        repaired.backgroundValue = "#000000";
    }

    return repaired;
}
