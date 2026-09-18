import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { escapeHTML } from './security.js';

export const GOOGLE_COLOR_G_SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M23.745%2012.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29%201.52-1.14%202.82-2.4%203.68v3.05h3.88c2.27-2.09%203.66-5.17%203.66-9.17z%22%2F%3E%3Cpath%20fill%3D%22%2334A853%22%20d%3D%22M12%2024c3.24%200%205.95-1.08%207.93-2.91l-3.88-3.05c-1.08.72-2.45%201.16-4.05%201.16-3.12%200-5.77-2.1-6.72-4.93H1.25v3.15C3.26%2021.36%207.33%2024%2012%2024z%22%2F%3E%3Cpath%20fill%3D%22%23FBBC05%22%20d%3D%22M5.28%2014.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45%208.18%200%2010.03%200%2012s.45%203.82%201.25%205.42l4.03-3.15z%22%2F%3E%3Cpath%20fill%3D%22%23EA4335%22%20d%3D%22M12%204.75c1.77%200%203.35.61%204.6%201.8l3.42-3.42C17.95%201.19%2015.24%200%2012%200%207.33%200%203.26%202.64%201.25%206.58l4.03%203.15c.95-2.83%203.6-4.98%206.72-4.98z%22%2F%3E%3C%2Fsvg%3E";

export const SEARCH_ENGINE_METADATA = {
    google: { name: 'Google', icon: GOOGLE_COLOR_G_SVG, placeholder: 'Search the web' },
    brave: { name: 'Brave', icon: 'https://brave.com/favicon.ico', placeholder: 'Search the web with Brave' },
    duckduckgo: { name: 'DuckDuckGo', icon: 'https://duckduckgo.com/favicon.ico', placeholder: 'Search privately with DuckDuckGo' },
    bing: { name: 'Bing', icon: 'https://www.bing.com/favicon.ico', placeholder: 'Search the web with Bing' },
    chatgpt: { name: 'ChatGPT', icon: 'https://chatgpt.com/favicon.ico', placeholder: 'Ask ChatGPT anything...' },
    perplexity: { name: 'Perplexity', icon: 'https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai', placeholder: 'Ask Perplexity anything...' },
    claude: { name: 'Claude', icon: 'https://www.google.com/s2/favicons?sz=64&domain=claude.ai', placeholder: 'Talk to Claude...' },
    robot_ai: { name: 'Robot AI', icon: '', isRobot: true, placeholder: 'Ask AI or search (Auto-routed)...' },
    custom_engine: { name: 'Custom', icon: 'https://www.google.com/favicon.ico', placeholder: 'Search custom engine...' }
};

export function updateSearchEngineUI() {
    const engine = state.settings.searchEngine || 'google';
    const meta = SEARCH_ENGINE_METADATA[engine] || SEARCH_ENGINE_METADATA.google;

    if (dom.searchEngineCurrentIcon) {
        if (meta.isRobot) {
            dom.searchEngineCurrentIcon.style.display = 'none';
            let robotSpan = dom.searchEngineBtn?.querySelector('.engine-icon-robot');
            if (!robotSpan) {
                robotSpan = document.createElement('span');
                robotSpan.className = 'engine-icon-robot';
                robotSpan.textContent = '🤖';
                dom.searchEngineBtn?.insertBefore(robotSpan, dom.searchEngineBtn.firstChild);
            }
            robotSpan.style.display = 'inline-flex';
        } else {
            const robotSpan = dom.searchEngineBtn?.querySelector('.engine-icon-robot');
            if (robotSpan) robotSpan.style.display = 'none';
            dom.searchEngineCurrentIcon.style.display = 'block';
            dom.searchEngineCurrentIcon.src = meta.icon;
            dom.searchEngineCurrentIcon.alt = meta.name;
        }
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
                window.open(url, '_blank');
            }
        };

        let debounceTimer = null;
        let latestQuerySeq = 0;

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

                try {
                    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
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
                } catch (err) { }
            }, 180);
        };

        if (dom.searchSuggestions && !dom.searchSuggestions._hasListener) {
            dom.searchSuggestions._hasListener = true;
            dom.searchSuggestions.onclick = (e) => {
                const li = e.target.closest('.suggestion-item');
                if (li) {
                    dom.searchInput.value = li.querySelector('span')?.textContent || '';
                    dom.searchForm?.requestSubmit();
                }
            };
        }

        dom.searchInput.onkeydown = (e) => {
            if (e.key === 'Escape') {
                if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
                dom.searchInput.blur();
                dom.searchContainer?.classList.remove('search-active');
                document.body.classList.remove('search-focused');
                return;
            }

            const items = dom.searchSuggestions.querySelectorAll('.suggestion-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelection(items);
            } else if (e.key === 'Enter' && selectedIndex > -1) {
                e.preventDefault();
                dom.searchInput.value = items[selectedIndex].querySelector('span').textContent;
                dom.searchForm.requestSubmit();
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
                    dom.searchInput.value = item.querySelector('span').textContent;
                }
            });
        }

        dom.searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = dom.searchInput.value.trim();
            handleSearch(query);
            dom.searchInput.value = '';
            dom.searchSuggestions.classList.add('hidden');
            dom.searchInput.blur();
            deactivateSearch();
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
