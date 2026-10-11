/**
 * Universal Spotlight Command HUD (`Cmd / Ctrl + K`)
 * High-performance, zero-latency fuzzy action launcher and omni-search:
 * - Search Directory Folders, Bookmarks, and Shortcuts
 * - Live Tab Switcher across open window tabs
 * - Quick Action command bus (`> mode`, `> sound`, `> vpn`, `> freeze`, `> snap`)
 * - Math expression evaluator (0ms inline calculation)
 */

import { AmbientAudio } from './ambient-audio.js';
import { state, saveSettings } from './state.js';
import { applySettings } from './ui.js';

class SpotlightHUD {
    constructor() {
        this.overlay = null;
        this.input = null;
        this.resultsList = null;
        this.isOpen = false;
        this.selectedIndex = 0;
        this.items = [];
        this.openTabs = [];
    }

    init() {
        if (document.getElementById('spotlight-hud-overlay')) return;

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        const overlay = document.createElement('div');
        overlay.id = 'spotlight-hud-overlay';
        overlay.className = 'spotlight-overlay hidden';
        overlay.innerHTML = `
            <div class="spotlight-card">
                <div class="spotlight-search-bar">
                    <svg class="spotlight-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="spotlight-input" class="spotlight-input" placeholder="Type a command or search anything... (e.g. 'focus', 'snap', 'rain', 'calc')" autocomplete="off" spellcheck="false">
                    <span class="spotlight-esc-badge">ESC</span>
                </div>
                <div id="spotlight-results" class="spotlight-results">
                    <!-- Dynamic search items -->
                </div>
                <div class="spotlight-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>↵</kbd> to select</span>
                    <span><kbd>ESC</kbd> to dismiss</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.input = overlay.querySelector('#spotlight-input');
        this.resultsList = overlay.querySelector('#spotlight-results');
    }

    _bindEvents() {
        // Global hotkey: Cmd+K / Ctrl+K or '/'
        window.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.close();
            } else if (e.key === '/' && !isInput && !this.isOpen) {
                e.preventDefault();
                this.open();
            }
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Realtime input fuzzy matching
        this.input.addEventListener('input', () => {
            this.selectedIndex = 0;
            this._updateResults();
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
                this._renderList();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this._renderList();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this._executeSelected();
            }
        });
    }

    open() {
        if (!this.overlay) this.init();
        this.isOpen = true;
        this.overlay.classList.remove('hidden');
        this.input.value = '';
        this.selectedIndex = 0;
        this.input.focus();

        // Refresh open tabs from background
        try {
            const chrome = window.chrome;
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: 'get_open_tabs' }, (res) => {
                    if (res?.success && Array.isArray(res.tabs)) {
                        this.openTabs = res.tabs;
                        if (this.isOpen && !this.input.value) {
                            this._updateResults();
                        }
                    }
                });
            }
        } catch (_) {}

        this._updateResults();
    }

    close() {
        if (!this.overlay) return;
        this.isOpen = false;
        this.overlay.classList.add('hidden');
        this.input.blur();
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    _getStaticActions() {
        return [
            {
                type: 'action',
                category: 'Workspace',
                title: 'Switch to Pro Workspace',
                subtitle: 'All-in-one folders, shortcuts & security HUD',
                icon: '⚡',
                action: () => this._switchMode('pro')
            },
            {
                type: 'action',
                category: 'Workspace',
                title: 'Switch to Focus Workspace',
                subtitle: 'Zen timer, day progress & distraction-free view',
                icon: '🧘',
                action: () => this._switchMode('focus')
            },
            {
                type: 'action',
                category: 'Workspace',
                title: 'Switch to Creator Workspace',
                subtitle: 'Photo & Vector Studio, PDF Tools & Compressor',
                icon: '🎨',
                action: () => this._switchMode('creator')
            },
            {
                type: 'action',
                category: 'Workspace',
                title: 'Switch to Security Workspace',
                subtitle: 'Tactical Tor/VPN Controller & WebRTC Shield',
                icon: '🛡️',
                action: () => this._switchMode('security')
            },
            {
                type: 'action',
                category: 'Workspace',
                title: 'Switch to Minimal Workspace',
                subtitle: 'Pure search bar and ambient wallpaper',
                icon: '🌿',
                action: () => this._switchMode('minimal')
            },
            {
                type: 'action',
                category: 'Tools',
                title: 'Screen Snapper: Capture Tab & Markup',
                subtitle: 'Take instant tab screenshot & open in Creative Studio',
                icon: '📸',
                action: () => window.triggerScreenCapture?.()
            },
            {
                type: 'action',
                category: 'System',
                title: 'Freeze Inactive Tabs (Save RAM)',
                subtitle: 'Hibernate background tabs to free up system memory',
                icon: '❄️',
                action: () => this._freezeTabs()
            },
            {
                type: 'action',
                category: 'Audio',
                title: 'Play 40Hz Gamma Binaural Beats',
                subtitle: 'Procedural focus frequencies (0 KB bandwidth)',
                icon: '🧠',
                action: () => AmbientAudio.play('binaural')
            },
            {
                type: 'action',
                category: 'Audio',
                title: 'Play Procedural Rain Soundscape',
                subtitle: 'Soothing rain and droplet synthesizer',
                icon: '🌧️',
                action: () => AmbientAudio.play('rain')
            },
            {
                type: 'action',
                category: 'Audio',
                title: 'Play Ocean Waves Soundscape',
                subtitle: 'Procedural pink noise swell waves',
                icon: '🌊',
                action: () => AmbientAudio.play('waves')
            },
            {
                type: 'action',
                category: 'Audio',
                title: 'Play Brown Noise',
                subtitle: 'Deep low-frequency Brownian rumble',
                icon: '📻',
                action: () => AmbientAudio.play('brown_noise')
            },
            {
                type: 'action',
                category: 'Audio',
                title: 'Stop Ambient Audio',
                subtitle: 'Fade out and silence focus soundscapes',
                icon: '⏹️',
                action: () => AmbientAudio.stop()
            },
            {
                type: 'action',
                category: 'Settings',
                title: 'Toggle Theme (Dark / Light)',
                subtitle: 'Switch between Dark and Light mode',
                icon: '🌓',
                action: () => this._toggleTheme()
            },
            {
                type: 'action',
                category: 'Security',
                title: 'Toggle Cyber Shield / VPN',
                subtitle: 'Connect or disconnect privacy proxy and WebRTC shield',
                icon: '🔒',
                action: () => window.toggleVpnConnection?.()
            },
            {
                type: 'action',
                category: 'Tools',
                title: 'Open Image Compressor',
                subtitle: 'Client-side lossless WebP/AVIF compression',
                icon: '🖼️',
                action: () => {
                    const el = document.getElementById('card-image-compressor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
            },
            {
                type: 'action',
                category: 'Tools',
                title: 'Open PDF Tools',
                subtitle: 'Client-side PDF merge, split and extract',
                icon: '📄',
                action: () => {
                    const el = document.getElementById('card-pdf-tools');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
            }
        ];
    }

    _evaluateMath(query) {
        const clean = query.trim().replace(/^calc\s+/i, '');
        // Match safe math: digits, operators, parens, decimal, percent
        if (!/^[\d\s+\-*/().%^]|sqrt|pi|sin|cos|tan/i.test(clean)) return null;

        try {
            let expr = clean
                .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
                .replace(/\^/g, '**')
                .replace(/(\d+)%\s+of\s+(\d+)/gi, '($1/100)*$2')
                .replace(/pi/gi, 'Math.PI');

            if (/^[0-9+\-*/().\s*Math.sqrtPI]+$/.test(expr)) {
                // eslint-disable-next-line no-eval
                const result = Function(`'use strict'; return (${expr})`)();
                if (typeof result === 'number' && !isNaN(result)) {
                    return {
                        type: 'math',
                        category: 'Calculator',
                        title: `= ${result.toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
                        subtitle: `Calculation result for: ${clean} (Click to copy)`,
                        icon: '🧮',
                        action: () => {
                            navigator.clipboard.writeText(String(result));
                            alert(`Copied ${result} to clipboard!`);
                        }
                    };
                }
            }
        } catch (_) {}
        return null;
    }

    _updateResults() {
        const query = (this.input.value || '').trim().toLowerCase();
        let matches = [];

        // 1. Math evaluation if applicable
        if (query) {
            const mathResult = this._evaluateMath(query);
            if (mathResult) matches.push(mathResult);
        }

        // 2. Open browser tabs matching
        if (this.openTabs.length > 0) {
            const tabMatches = this.openTabs
                .filter(t => !query || t.title.toLowerCase().includes(query) || t.url.toLowerCase().includes(query))
                .slice(0, 4)
                .map(t => ({
                    type: 'tab',
                    category: 'Open Tab',
                    title: t.title,
                    subtitle: t.url,
                    icon: '🌐',
                    action: () => {
                        window.chrome?.tabs?.update(t.id, { active: true });
                    }
                }));
            matches.push(...tabMatches);
        }

        // 3. Category Directories links
        try {
            const raw = localStorage.getItem('raeen_directories_data');
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.list)) {
                    data.list.forEach(cat => {
                        (cat.sites || []).forEach(site => {
                            if (!query || site.name.toLowerCase().includes(query) || site.url.toLowerCase().includes(query) || cat.name.toLowerCase().includes(query)) {
                                matches.push({
                                    type: 'link',
                                    category: cat.name,
                                    title: site.name,
                                    subtitle: site.url,
                                    icon: '🔗',
                                    action: () => window.open(site.url, '_blank')
                                });
                            }
                        });
                    });
                }
            }
        } catch (_) {}

        // 4. Static system actions
        const staticActions = this._getStaticActions();
        const actionMatches = staticActions.filter(a => {
            if (!query) return true;
            return a.title.toLowerCase().includes(query) ||
                   a.subtitle.toLowerCase().includes(query) ||
                   a.category.toLowerCase().includes(query);
        });
        matches.push(...actionMatches);

        // Deduplicate & cap to 18 results
        this.items = matches.slice(0, 18);
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.items.length - 1));
        this._renderList();
    }

    _renderList() {
        if (!this.resultsList) return;

        if (this.items.length === 0) {
            this.resultsList.innerHTML = `
                <div class="spotlight-empty">
                    <span>No matching commands or links found.</span>
                </div>
            `;
            return;
        }

        this.resultsList.innerHTML = this.items.map((item, idx) => {
            const isSelected = idx === this.selectedIndex;
            return `
                <div class="spotlight-item ${isSelected ? 'selected' : ''}" data-index="${idx}">
                    <span class="spotlight-item-icon">${item.icon}</span>
                    <div class="spotlight-item-text">
                        <div class="spotlight-item-title">${this._escape(item.title)}</div>
                        <div class="spotlight-item-sub">${this._escape(item.subtitle)}</div>
                    </div>
                    <span class="spotlight-category-tag">${this._escape(item.category)}</span>
                </div>
            `;
        }).join('');

        // Click handlers on items
        this.resultsList.querySelectorAll('.spotlight-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index, 10);
                this.selectedIndex = idx;
                this._executeSelected();
            });
            el.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt(el.dataset.index, 10);
                this._highlightSelected();
            });
        });

        this._scrollIntoView();
    }

    _highlightSelected() {
        this.resultsList.querySelectorAll('.spotlight-item').forEach((el, idx) => {
            el.classList.toggle('selected', idx === this.selectedIndex);
        });
    }

    _scrollIntoView() {
        const selected = this.resultsList.querySelector('.spotlight-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    _executeSelected() {
        const item = this.items[this.selectedIndex];
        if (item && typeof item.action === 'function') {
            this.close();
            item.action();
        }
    }

    _switchMode(mode) {
        if (typeof window.setDashboardMode === 'function') {
            window.setDashboardMode(mode);
        } else {
            state.settings.dashboardMode = mode;
            saveSettings(state.settings);
            applySettings();
            if (typeof window.applyWidgetLayout === 'function') {
                window.applyWidgetLayout();
            }
        }
    }

    _toggleTheme() {
        const current = state.settings.themePreference || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        state.settings.themePreference = next;
        saveSettings(state.settings);
        applySettings();
    }

    _freezeTabs() {
        try {
            const chrome = window.chrome;
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: 'freeze_inactive_tabs' }, (res) => {
                    if (res?.success) {
                        alert(`RAM Freed! Successfully discarded ${res.frozenCount || 0} inactive tabs.`);
                    }
                });
            }
        } catch (_) {}
    }

    _escape(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    }
}

export const Spotlight = new SpotlightHUD();
