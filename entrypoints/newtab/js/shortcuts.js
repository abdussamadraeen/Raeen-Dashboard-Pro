import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { escapeHTML, escapeAttribute, sanitizeURL } from './security.js';

export function renderShortcuts() {
    if (!dom.topSitesWidget) return;
    
    // Preserve drag & resize handles if they exist
    const dragHandle = dom.topSitesWidget.querySelector('.drag-handle');
    const resizeHandle = dom.topSitesWidget.querySelector('.resize-handle');
    
    dom.topSitesWidget.innerHTML = '';
    
    if (dragHandle) dom.topSitesWidget.appendChild(dragHandle);
    
    let hasShortcuts = false;
    if (state.settings.topSitesSource === 'favorites') {
        const list = state.settings.shortcuts || [];
        hasShortcuts = list.length > 0;
        list.forEach((sc, i) => {
            const a = document.createElement('a');
            a.href = sanitizeURL(sc.url);
            a.className = 'shortcut';
            a.style.setProperty('--item-index', i);
            const iconUrl = sc.icon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(sc.url)}`;
            a.innerHTML = `<img src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(sc.name)}"><span>${escapeHTML(sc.name)}</span>`;
            dom.topSitesWidget.appendChild(a);
        });
        dom.topSitesWidget.classList.toggle('hidden', !state.settings.showTopSites || !hasShortcuts);
    } else {
        if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get(sites => {
                const list = sites.slice(0, 8);
                hasShortcuts = list.length > 0;
                list.forEach((site, i) => {
                    const a = document.createElement('a');
                    a.href = sanitizeURL(site.url);
                    a.className = 'shortcut';
                    a.style.setProperty('--item-index', i);
                    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site.url)}`;
                    a.innerHTML = `<img src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(site.title)}"><span>${escapeHTML(site.title)}</span>`;
                    dom.topSitesWidget.appendChild(a);
                });
                dom.topSitesWidget.classList.toggle('hidden', !state.settings.showTopSites || !hasShortcuts);
            });
        }
    }
    
    if (resizeHandle) dom.topSitesWidget.appendChild(resizeHandle);
    
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
                <strong>${escapeHTML(sc.name)}</strong>
                <span>${escapeHTML(sc.url)}</span>
            </div>
            <div class="managed-item-actions">
                <button data-index="${i}" class="remove-shortcut-btn">Remove</button>
            </div>
        </div>
    `).join('');
    
    if (!dom.shortcutsList._hasListener) {
        dom.shortcutsList._hasListener = true;
        dom.shortcutsList.onclick = (e) => {
            const btn = e.target.closest('.remove-shortcut-btn');
            if (btn) {
                removeShortcut(parseInt(btn.dataset.index));
            }
        };
    }
}
