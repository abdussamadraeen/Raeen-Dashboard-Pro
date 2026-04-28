import { state, saveSettings } from './state.js';
import { dom } from './dom.js';

export function renderApps() {
    const renderTab = (arr, el) => {
        if (!el) return;
        el.innerHTML = (arr || []).map(app => `<a href="${app.url}" class="app-item"><img src="${app.icon || 'https://www.google.com/s2/favicons?domain=' + app.url}" alt="${app.name}"><span>${app.name}</span></a>`).join('');
    };
    renderTab(state.settings.googleApps, dom.googleAppsGrid);
    renderTab(state.settings.msApps, dom.msAppsGrid);
    renderTab(state.settings.aiApps, dom.aiAppsGrid);
    renderTab(state.settings.customApps, dom.customAppsGrid);
}

export function saveCustomApp() {
    const name = dom.appNameInput.value.trim();
    const url = dom.appUrlInput.value.trim();
    if (!name || !url) return;
    const icon = dom.appIconInput.value.trim() || `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;
    state.settings.customApps.push({ name, url, icon });
    saveSettings(state.settings);
    renderApps();
    dom.addAppModal.classList.add('hidden');
    dom.appNameInput.value = '';
    dom.appUrlInput.value = '';
    dom.appIconInput.value = '';
}
