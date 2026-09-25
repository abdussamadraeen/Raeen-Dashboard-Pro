import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { escapeHTML } from './security.js';

export const GOOGLE_COLOR_G_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M23.745%2012.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29%201.52-1.14%202.82-2.4%203.68v3.05h3.88c2.27-2.09%203.66-5.17%203.66-9.17z%22%2F%3E%3Cpath%20fill%3D%22%2334A853%22%20d%3D%22M12%2024c3.24%200%205.95-1.08%207.93-2.91l-3.88-3.05c-1.08.72-2.45%201.16-4.05%201.16-3.12%200-5.77-2.1-6.72-4.93H1.25v3.15C3.26%2021.36%207.33%2024%2012%2024z%22%2F%3E%3Cpath%20fill%3D%22%23FBBC05%22%20d%3D%22M5.28%2014.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45%208.18%200%2010.03%200%2012s.45%203.82%201.25%205.42l4.03-3.15z%22%2F%3E%3Cpath%20fill%3D%22%23EA4335%22%20d%3D%22M12%204.75c1.77%200%203.35.61%204.6%201.8l3.42-3.42C17.95%201.19%2015.24%200%2012%200%207.33%200%203.26%202.64%201.25%206.58l4.03%203.15c.95-2.83%203.6-4.98%206.72-4.98z%22%2F%3E%3C%2Fsvg%3E";
export const BRAVE_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23FB542B%22%20d%3D%22M12%202L3%206v6c0%205.55%203.84%2010.74%209%2012%205.16-1.26%209-6.45%209-12V6l-9-4zm5.5%2012.8c-.8%201.8-2.6%203.1-4.7%203.5-.3.1-.7.1-1%200-2.1-.4-3.9-1.7-4.7-3.5-.3-.7-.4-1.5-.4-2.3%200-1.8.8-3.4%202.1-4.5.3-.3.7-.5%201.1-.7.3-.1.6-.2%201-.2s.7.1%201%20.2c.4.2.8.4%201.1.7%201.3%201.1%202.1%202.7%202.1%204.5.1.8%200%201.6-.3%202.3z%22%2F%3E%3C%2Fsvg%3E";
export const DUCKDUCKGO_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%20fill%3D%22%23DE5833%22%2F%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M16.5%2013.5c-.3-1.6-1.5-2.8-3-3.2.1-.5.3-1.2.7-1.8.2-.3.1-.6-.2-.7-.3-.1-.6.1-.7.4-.4.7-.6%201.4-.7%202-.7.2-1.3.6-1.8%201.1-.4-.3-.9-.4-1.4-.3-.9.1-1.6.8-1.7%201.7-.1.8.4%201.5%201.1%201.8.2%201.3%201.1%202.3%202.3%202.6.4.1.8.1%201.2%200%201.9-.3%203.3-1.8%203.5-3.6z%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%2213.5%22%20r%3D%22.8%22%20fill%3D%22%23222%22%2F%3E%3C%2Fsvg%3E";
export const BING_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23008080%22%20d%3D%22M5%203v18l5-2.8V6.8l5.8%203.2-2.8%204.2%204.4%202.5L20%2014V8.5L9.6%203H5z%22%2F%3E%3C%2Fsvg%3E";
export const CHATGPT_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20rx%3D%226%22%20fill%3D%22%2310A37F%22%2F%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M18.8%2010.2a3.8%203.8%200%200%200-.3-3.1%203.9%203.9%200%200%200-4.3-1.8A3.8%203.8%200%200%200%2011.5%204a3.9%203.9%200%200%200-3.7%202.7%203.8%203.8%200%200%200-2.3%201.6%203.9%203.9%200%200%200%20.4%204.7%203.8%203.8%200%200%200%20.3%203.1%203.9%203.9%200%200%200%204.3%201.8%203.8%203.8%200%200%200%202.7%201.3%203.9%203.9%200%200%200%203.7-2.7%203.8%203.8%200%200%200%202.3-1.6%203.9%203.9%200%200%200-.4-4.7z%22%2F%3E%3C%2Fsvg%3E";
export const PERPLEXITY_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20rx%3D%226%22%20fill%3D%22%2320B2AA%22%2F%3E%3Cpath%20stroke%3D%22%23FFF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20d%3D%22M12%204v16m-8-8h16m-13.6-5.6l11.2%2011.2m0-11.2L6.4%2017.6%22%2F%3E%3C%2Fsvg%3E";
export const CLAUDE_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20rx%3D%226%22%20fill%3D%22%23D97706%22%2F%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M12%205.5l1.6%204.9%204.9%201.6-4.9%201.6-1.6%204.9-1.6-4.9-4.9-1.6%204.9-1.6z%22%2F%3E%3C%2Fsvg%3E";
export const ROBOT_AI_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20rx%3D%226%22%20fill%3D%22%232563EB%22%2F%3E%3Crect%20width%3D%2214%22%20height%3D%2210%22%20x%3D%225%22%20y%3D%228%22%20rx%3D%222.5%22%20fill%3D%22none%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%221.8%22%2F%3E%3Cpath%20d%3D%22M12%204v4%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%2213%22%20r%3D%221.2%22%20fill%3D%22%23FFF%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2213%22%20r%3D%221.2%22%20fill%3D%22%23FFF%22%2F%3E%3C%2Fsvg%3E";

export const SEARCH_ENGINE_METADATA = {
    google: { name: 'Google', icon: GOOGLE_COLOR_G_SVG, placeholder: 'Search the web' },
    brave: { name: 'Brave', icon: BRAVE_SVG, placeholder: 'Search the web with Brave' },
    duckduckgo: { name: 'DuckDuckGo', icon: DUCKDUCKGO_SVG, placeholder: 'Search privately with DuckDuckGo' },
    bing: { name: 'Bing', icon: BING_SVG, placeholder: 'Search the web with Bing' },
    chatgpt: { name: 'ChatGPT', icon: CHATGPT_SVG, placeholder: 'Ask ChatGPT anything...' },
    perplexity: { name: 'Perplexity', icon: PERPLEXITY_SVG, placeholder: 'Ask Perplexity anything...' },
    claude: { name: 'Claude', icon: CLAUDE_SVG, placeholder: 'Talk to Claude...' },
    robot_ai: { name: 'Robot AI', icon: ROBOT_AI_SVG, isRobot: true, placeholder: 'Ask AI or search (Auto-routed)...' },
    custom_engine: { name: 'Custom', icon: GOOGLE_COLOR_G_SVG, placeholder: 'Search custom engine...' }
};

export function updateSearchEngineUI() {
    const engine = state.settings.searchEngine || 'google';
    const meta = SEARCH_ENGINE_METADATA[engine] || SEARCH_ENGINE_METADATA.google;

    if (dom.searchEngineCurrentIcon) {
        dom.searchEngineCurrentIcon.style.display = 'block';
        dom.searchEngineCurrentIcon.src = meta.icon;
        dom.searchEngineCurrentIcon.alt = meta.name;
        const robotSpan = dom.searchEngineBtn?.querySelector('.engine-icon-robot');
        if (robotSpan) robotSpan.style.display = 'none';
    }

    if (dom.searchInput) {
        dom.searchInput.placeholder = meta.placeholder;
    }

    if (dom.searchEngineMenu) {
        dom.searchEngineMenu.querySelectorAll('.engine-menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.engine === engine);
        });
    }
}

export function resolveSearch(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return { url: '', engine: 'google', cleanQuery: '' };

    const engine = state.settings.searchEngine;
    
    // Default URLs
    const urls = {
        google: 'https://www.google.com/search?q=%s',
        duckduckgo: 'https://duckduckgo.com/?q=%s',
        bing: 'https://www.bing.com/search?q=%s',
        brave: 'https://search.brave.com/search?q=%s',
        chatgpt: 'https://chatgpt.com/?q=%s',
        perplexity: 'https://www.perplexity.ai/search?q=%s',
        claude: 'https://claude.ai/?q=%s',
        gemini: 'https://gemini.google.com/app?q=%s',
    };

    if (engine === 'custom_engine') {
        const base = state.settings.customSearchUrl || 'https://www.google.com/search?q=%s';
        return { url: base.replace('%s', encodeURIComponent(query)), engine: 'custom', cleanQuery: query };
    }

    if (engine !== 'robot_ai') {
        const base = urls[engine] || urls.google;
        return { url: base.replace('%s', encodeURIComponent(query)), engine, cleanQuery: query };
    }

    // --- Robot AI Router Logic ---
    // 1. Check for slash overrides
    let targetEngine = null;
    let cleanQuery = query;

    if (query.startsWith('/')) {
        const parts = query.split(/\s+/);
        const command = parts[0].toLowerCase();
        const rest = parts.slice(1).join(' ');

        const slashMap = {
            '/gpt': 'chatgpt',
            '/chatgpt': 'chatgpt',
            '/claude': 'claude',
            '/gemini': 'gemini',
            '/gem': 'gemini',
            '/perp': 'perplexity',
            '/perplexity': 'perplexity',
            '/g': 'google',
            '/google': 'google',
            '/b': 'bing',
            '/bing': 'bing',
            '/ddg': 'duckduckgo',
            '/duck': 'duckduckgo',
            '/brave': 'brave'
        };

        if (slashMap[command]) {
            targetEngine = slashMap[command];
            cleanQuery = rest;
        }
    }

    // 2. Heuristics fallback if no slash command matched
    if (!targetEngine) {
        const lower = query.toLowerCase();
        
        // List of programming keywords
        const codingKeywords = [
            'code', 'run', 'error', 'bug', 'class', 'function', 'api', 'npm', 'git', 
            'python', 'javascript', 'typescript', 'rust', 'java', 'c++', 'html', 'css', 
            'sql', 'docker', 'kubernetes', 'json', 'compiler', 'syntax', 'array', 
            'hashmap', 'pointer', 'regex', 'install', 'setup', 'write a function',
            'programming', 'algorithm', 'binary search', 'recursion'
        ];

        // List of research keywords/phrases
        const researchKeywords = [
            'why does', 'explain the', 'history of', 'difference between', 'scientific', 
            'statistics', 'evidence', 'mechanism of', 'how does', 'compare and', 
            'what is the meaning of', 'concept of', 'literature on', 'theoretical'
        ];

        const isCoding = codingKeywords.some(kw => lower.includes(kw));
        const isResearch = researchKeywords.some(kw => lower.includes(kw));
        const wordCount = query.split(/\s+/).length;

        if (isCoding) {
            targetEngine = 'claude';
        } else if (isResearch || wordCount >= 6) {
            targetEngine = 'perplexity';
        } else {
            targetEngine = 'google';
        }
    }

    const base = urls[targetEngine] || urls.google;
    return { url: base.replace('%s', encodeURIComponent(cleanQuery)), engine: targetEngine, cleanQuery };
}

export function setupSearch() {
    let selectedIndex = -1;

    if (dom.searchInput) {
        const handleSearch = (query) => {
            if (!query) return;
            const { url } = resolveSearch(query);
            if (url) {
                if (state.settings.openSearchInNewTab) {
                    window.open(url, '_blank');
                } else {
                    window.location.href = url;
                }
            }
        };

        let debounceTimer = null;
        let latestQuerySeq = 0;
        let activeSearchController = null;

        dom.searchInput.oninput = (e) => {
            const queryRaw = e.target.value;
            let query = queryRaw.trim();
            selectedIndex = -1;
            
            if (!query) {
                if (dom.searchSuggestions) {
                    dom.searchSuggestions.classList.add('hidden');
                    dom.searchSuggestions.innerHTML = '';
                }
                return;
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const currentSeq = ++latestQuerySeq;

                // Strip slash command prefix for autocomplete queries
                if (query.startsWith('/')) {
                    const parts = query.split(/\s+/);
                    if (parts.length > 1) {
                        query = parts.slice(1).join(' ');
                    } else {
                        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                        return;
                    }
                }

                if (activeSearchController) {
                    activeSearchController.abort();
                }
                activeSearchController = new AbortController();

                try {
                    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`, {
                        signal: activeSearchController.signal
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    if (currentSeq !== latestQuerySeq) return; // Discard stale responses
                    const data = await res.json();
                    const suggestions = (data[1] || []).slice(0, 6);
                    if (currentSeq !== latestQuerySeq) return;

                    if (dom.searchSuggestions) {
                        dom.searchSuggestions.innerHTML = suggestions.map((s, i) => `
                            <li class="suggestion-item" data-index="${i}">
                                <svg viewBox="0 0 24 24" width="16" height="16" style="opacity:0.5"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
                                <span>${escapeHTML(s)}</span>
                            </li>`).join('');
                        dom.searchSuggestions.classList.toggle('hidden', suggestions.length === 0);
                    }
                } catch (err) { 
                    if (err.name !== 'AbortError') console.warn('Suggest error', err);
                }
            }, 180);
        };

        if (dom.searchSuggestions && !dom.searchSuggestions._hasListener) {
            dom.searchSuggestions._hasListener = true;
            dom.searchSuggestions.onclick = (e) => {
                const li = e.target.closest('.suggestion-item');
                if (li) {
                    const text = (li.querySelector('span')?.textContent || '').trim();
                    if (text) {
                        handleSearch(text);
                        dom.searchInput.value = '';
                        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                        dom.searchInput.blur();
                        deactivateSearch();
                    }
                }
            };
        }

        dom.searchInput.onkeydown = (e) => {
            if (e.key === 'Escape') {
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                dom.searchInput.blur();
                deactivateSearch();
                return;
            }

            const items = dom.searchSuggestions ? dom.searchSuggestions.querySelectorAll('.suggestion-item') : [];

            if (e.key === 'ArrowDown') {
                if (items.length > 0) {
                    e.preventDefault();
                    selectedIndex = (selectedIndex + 1) % items.length;
                    updateSelection(items);
                }
            } else if (e.key === 'ArrowUp') {
                if (items.length > 0) {
                    e.preventDefault();
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    updateSelection(items);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                let query = '';
                if (selectedIndex > -1 && items[selectedIndex]) {
                    query = (items[selectedIndex].querySelector('span')?.textContent || '').trim();
                }
                if (!query) {
                    query = dom.searchInput.value.trim();
                }
                if (query) {
                    handleSearch(query);
                    dom.searchInput.value = '';
                    if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                    dom.searchInput.blur();
                    deactivateSearch();
                }
            }
        };

        // Smooth interactive position animation for search bar (activated when text cursor/focus is inside)
        const activateSearch = () => {
            dom.searchContainer?.classList.add('search-active');
            document.body.classList.add('search-focused');
        };

        const deactivateSearch = () => {
            dom.searchContainer?.classList.remove('search-active');
            document.body.classList.remove('search-focused');
        };

        if (dom.searchContainer) {
            dom.searchContainer.addEventListener('click', () => {
                if (dom.searchInput && document.activeElement !== dom.searchInput) {
                    dom.searchInput.focus();
                }
            });
        }

        if (dom.searchInput) {
            dom.searchInput.addEventListener('focus', activateSearch);
            dom.searchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (document.activeElement !== dom.searchInput) {
                        deactivateSearch();
                    }
                }, 120);
            });
        }

        function updateSelection(items) {
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === selectedIndex);
                if (i === selectedIndex) {
                    dom.searchInput.value = item.querySelector('span')?.textContent || '';
                }
            });
        }

        dom.searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = dom.searchInput.value.trim();
            if (query) {
                handleSearch(query);
                dom.searchInput.value = '';
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                dom.searchInput.blur();
                deactivateSearch();
            }
        };

        document.addEventListener('click', (e) => {
            if (!dom.searchContainer.contains(e.target)) {
                dom.searchSuggestions.classList.add('hidden');
                dom.searchEngineMenu?.classList.add('hidden');
                dom.searchEngineBtn?.classList.remove('open');
                deactivateSearch();
            }
        });

        // Search engine switcher button toggle
        if (dom.searchEngineBtn && dom.searchEngineMenu) {
            dom.searchEngineBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dom.searchEngineMenu.classList.contains('hidden');
                dom.searchEngineMenu.classList.toggle('hidden', !isHidden);
                dom.searchEngineBtn.classList.toggle('open', isHidden);
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
            };

            // Select engine from dropdown
            dom.searchEngineMenu.querySelectorAll('.engine-menu-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const chosenEngine = item.dataset.engine;
                    if (chosenEngine) {
                        state.settings.searchEngine = chosenEngine;
                        saveSettings(state.settings);
                        updateSearchEngineUI();
                        // Sync settings modal radio buttons if open
                        const radio = document.querySelector(`input[name="search_engine"][value="${chosenEngine}"]`);
                        if (radio) radio.checked = true;
                    }
                    dom.searchEngineMenu.classList.add('hidden');
                    dom.searchEngineBtn.classList.remove('open');
                    dom.searchInput?.focus();
                };
            });

            // Customize list button -> open Settings Modal on Search Tab
            if (dom.customizeEnginesBtn) {
                dom.customizeEnginesBtn.onclick = (e) => {
                    e.stopPropagation();
                    dom.searchEngineMenu.classList.add('hidden');
                    dom.searchEngineBtn.classList.remove('open');
                    // Open settings modal
                    if (dom.modalOverlay) {
                        dom.modalOverlay.classList.remove('hidden');
                        // Switch to Search tab
                        dom.sidebarTabs.forEach(t => t.classList.remove('active'));
                        dom.tabPanes.forEach(p => p.classList.remove('active'));
                        const searchTab = document.querySelector('.sidebar-tab[data-target="tab-search"]');
                        const searchPane = document.getElementById('tab-search');
                        if (searchTab && searchPane) {
                            searchTab.classList.add('active');
                            searchPane.classList.add('active');
                        }
                    }
                };
            }
        }

        // Initialize UI state
        updateSearchEngineUI();
    }
}
