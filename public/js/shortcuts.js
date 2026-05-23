import { state, saveSettings } from './state.js';
import { dom } from './dom.js';

export function renderShortcuts() {
    if (!dom.topSitesWidget) return;
    dom.topSitesWidget.innerHTML = '';
    if (state.settings.topSitesSource === 'favorites') {
        (state.settings.shortcuts || []).forEach((sc, i) => {
            const a = document.createElement('a');
            a.href = sc.url;
            a.className = 'shortcut';
            a.style.setProperty('--item-index', i);
            const iconUrl = sc.icon || `https://www.google.com/s2/favicons?sz=64&domain_url=${sc.url}`;
            a.innerHTML = `<img src="${iconUrl}" alt="${sc.name}"><span>${sc.name}</span>`;
            dom.topSitesWidget.appendChild(a);
        });
    } else {
        if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get(sites => {
                sites.slice(0, 8).forEach((site, i) => {
                    const a = document.createElement('a');
                    a.href = site.url;
                    a.className = 'shortcut';
                    a.style.setProperty('--item-index', i);
                    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${site.url}`;
                    a.innerHTML = `<img src="${iconUrl}" alt="${site.title}"><span>${site.title}</span>`;
                    dom.topSitesWidget.appendChild(a);
                });
            });
        }
    }
    renderManagedShortcuts();
}

export function addShortcut() {
    const name = dom.newShortcutName.value.trim();
    const url = dom.newShortcutUrl.value.trim();
    if (name && url) {
        if (!state.settings.shortcuts) state.settings.shortcuts = [];
        state.settings.shortcuts.push({ name, url, icon: '' });
        saveSettings(state.settings);
        renderShortcuts();
        dom.newShortcutName.value = '';
        dom.newShortcutUrl.value = '';
    }
}

export function removeShortcut(index) {
    state.settings.shortcuts.splice(index, 1);
    saveSettings(state.settings);
    renderShortcuts();
}

export function renderManagedShortcuts() {
    if (!dom.shortcutsList) return;
    dom.shortcutsList.innerHTML = (state.settings.shortcuts || []).map((sc, i) => `
        <div class="managed-item">
            <div>
                <strong>${sc.name}</strong>
                <span>${sc.url}</span>
            </div>
            <div class="managed-item-actions">
                <button data-index="${i}" class="remove-shortcut-btn">Remove</button>
            </div>
        </div>
    `).join('');
    dom.shortcutsList.querySelectorAll('.remove-shortcut-btn').forEach(btn => {
        btn.onclick = () => removeShortcut(parseInt(btn.dataset.index));
    });
}
