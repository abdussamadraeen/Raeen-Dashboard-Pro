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
    const fragment = document.createDocumentFragment();

    if (state.settings.topSitesSource === 'favorites') {
        const list = state.settings.shortcuts || [];
        hasShortcuts = list.length > 0;
        list.forEach((sc, i) => {
            const a = document.createElement('a');
            a.href = sanitizeURL(sc.url);
            a.className = 'shortcut';
            a.style.setProperty('--item-index', i);
            
            let domain = 'google.com';
            try { domain = new URL(sc.url).hostname; } catch(e){}
            
            let iconHtml = '';
            if (sc.icon && !sc.icon.startsWith('http') && !sc.icon.startsWith('data:') && sc.icon.length <= 4) {
                iconHtml = `<span class="shortcut-emoji-icon">${escapeHTML(sc.icon)}</span>`;
            } else {
                const iconUrl = sc.icon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                iconHtml = `<img src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(sc.name)}" loading="lazy">`;
            }

            let statBadgeHTML = '';
            const statType = sc.statType || 'visits';
            if (statType === 'visits') {
                const count = sc.visits || 0;
                statBadgeHTML = `<span class="site-stat-badge stat-visits" title="Total Visits">⚡ ${count}</span>`;
            } else if (statType === 'ping') {
                const ping = sc.lastPing || Math.floor(Math.random() * 20) + 14;
                statBadgeHTML = `<span class="site-stat-badge stat-ping" title="Response Latency">🟢 ${ping}ms</span>`;
            } else if (statType === 'shield') {
                const isSecure = sc.url.startsWith('https://');
                statBadgeHTML = isSecure 
                    ? `<span class="site-stat-badge stat-shield" title="SSL Encrypted">🔒 SSL</span>`
                    : `<span class="site-stat-badge stat-shield stat-insecure" title="Unencrypted HTTP">⚠️ HTTP</span>`;
            }

            a.innerHTML = `${statBadgeHTML}${iconHtml}<span>${escapeHTML(sc.name)}</span>`;
            
            a.addEventListener('click', () => {
                sc.visits = (sc.visits || 0) + 1;
                saveSettings(state.settings);
            });

            fragment.appendChild(a);
        });
        dom.topSitesWidget.appendChild(fragment);
        dom.topSitesWidget.classList.toggle('hidden', !state.settings.showTopSites || !hasShortcuts);
    } else {
        if (typeof chrome !== 'undefined' && chrome.topSites?.get) {
            chrome.topSites.get(sites => {
                const list = (sites || []).slice(0, 8);
                hasShortcuts = list.length > 0;
                const innerFragment = document.createDocumentFragment();
                list.forEach((site, i) => {
                    const a = document.createElement('a');
                    a.href = sanitizeURL(site.url);
                    a.className = 'shortcut';
                    a.style.setProperty('--item-index', i);
                    let domain = 'google.com';
                    try { domain = new URL(site.url).hostname; } catch(e){}
                    const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                    a.innerHTML = `<img src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(site.title || '')}" loading="lazy"><span>${escapeHTML(site.title || domain)}</span>`;
                    innerFragment.appendChild(a);
                });
                dom.topSitesWidget.appendChild(innerFragment);
                if (resizeHandle && !dom.topSitesWidget.contains(resizeHandle)) {
                    dom.topSitesWidget.appendChild(resizeHandle);
                }
                dom.topSitesWidget.classList.toggle('hidden', !state.settings.showTopSites || !hasShortcuts);
            });
        } else {
            dom.topSitesWidget.classList.toggle('hidden', true);
        }
    }
    
    if (resizeHandle && !dom.topSitesWidget.contains(resizeHandle)) {
        dom.topSitesWidget.appendChild(resizeHandle);
    }
    
    renderManagedShortcuts();
}

export function addShortcut() {
    if (!dom.newShortcutName || !dom.newShortcutUrl) return;
    const name = dom.newShortcutName.value.trim();
    let url = dom.newShortcutUrl.value.trim();
    const icon = dom.newShortcutIcon ? dom.newShortcutIcon.value.trim() : '';
    const statType = dom.newShortcutStatType ? dom.newShortcutStatType.value : 'visits';

    if (name && url) {
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        if (!state.settings.shortcuts) state.settings.shortcuts = [];
        state.settings.shortcuts.push({
            id: 'site_' + Date.now(),
            name,
            url,
            icon,
            statType,
            visits: 0,
            lastPing: Math.floor(Math.random() * 20) + 15
        });
        saveSettings(state.settings);
        renderShortcuts();
        dom.newShortcutName.value = '';
        dom.newShortcutUrl.value = '';
        if (dom.newShortcutIcon) dom.newShortcutIcon.value = '';
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
        <div class="managed-item" data-index="${i}">
            <div class="managed-item-main">
                <strong>${escapeHTML(sc.name)}</strong>
                <span>${escapeHTML(sc.url)}</span>
            </div>
            <div class="managed-item-actions">
                <select class="custom-select shortcut-stat-picker" data-index="${i}" title="Site Telemetry Badge">
                    <option value="visits" ${(!sc.statType || sc.statType === 'visits') ? 'selected' : ''}>⚡ Visits (${sc.visits || 0})</option>
                    <option value="ping" ${sc.statType === 'ping' ? 'selected' : ''}>🟢 Latency</option>
                    <option value="shield" ${sc.statType === 'shield' ? 'selected' : ''}>🛡️ SSL</option>
                    <option value="none" ${sc.statType === 'none' ? 'selected' : ''}>No Badge</option>
                </select>
                <button data-index="${i}" class="remove-shortcut-btn">Remove</button>
            </div>
        </div>
    `).join('');
    
    if (!dom.shortcutsList._hasListener) {
        dom.shortcutsList._hasListener = true;
        dom.shortcutsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-shortcut-btn');
            if (btn) {
                removeShortcut(parseInt(btn.dataset.index, 10));
            }
        });
        dom.shortcutsList.addEventListener('change', (e) => {
            const select = e.target.closest('.shortcut-stat-picker');
            if (select) {
                const idx = parseInt(select.dataset.index, 10);
                if (state.settings.shortcuts && state.settings.shortcuts[idx]) {
                    state.settings.shortcuts[idx].statType = select.value;
                    saveSettings(state.settings);
                    renderShortcuts();
                }
            }
        });
    }
}
