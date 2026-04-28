import { state } from './state.js';
import { dom } from './dom.js';

export function getSearchUrl() {
    const engine = state.settings.searchEngine;
    if (engine === 'custom_engine') {
        return state.settings.customSearchUrl || 'https://www.google.com/search?q=%s';
    }
    const urls = {
        google: 'https://www.google.com/search?q=%s',
        duckduckgo: 'https://duckduckgo.com/?q=%s',
        bing: 'https://www.bing.com/search?q=%s',
        brave: 'https://search.brave.com/search?q=%s',
        chatgpt: 'https://chatgpt.com/search?q=%s',
        perplexity: 'https://www.perplexity.ai/search?q=%s',
        // github_copilot: 'https://github.com/search?q=%s&type=code',
    };
    return urls[engine] || urls.google;
}

export function setupSearch() {
    let selectedIndex = -1;

    if (dom.searchInput) {
        dom.searchInput.oninput = async (e) => {
            const query = e.target.value.trim();
            selectedIndex = -1;
            if (!query) { dom.searchSuggestions.classList.add('hidden'); return; }
            try {
                const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                const suggestions = (data[1] || []).slice(0, 6);
                dom.searchSuggestions.innerHTML = suggestions.map((s, i) => `
                    <li class="suggestion-item" data-index="${i}">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="opacity:0.5"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
                        <span>${s}</span>
                    </li>`).join('');
                dom.searchSuggestions.classList.toggle('hidden', suggestions.length === 0);
                
                dom.searchSuggestions.querySelectorAll('li').forEach(li => {
                    li.onclick = () => { 
                        dom.searchInput.value = li.querySelector('span').textContent; 
                        dom.searchForm.requestSubmit(); 
                    };
                });
            } catch (err) { }
        };

        dom.searchInput.onkeydown = (e) => {
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
            } else if (e.key === 'Escape') {
                dom.searchSuggestions.classList.add('hidden');
            }
        };

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
            if (!query) return;
            const url = getSearchUrl().replace('%s', encodeURIComponent(query));
            window.location.href = url;
        };

        document.addEventListener('click', (e) => {
            if (!dom.searchContainer.contains(e.target)) {
                dom.searchSuggestions.classList.add('hidden');
            }
        });
    }
}
