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
        github_copilot: 'https://github.com/search?q=%s&type=code',
    };
    return urls[engine] || urls.google;
}

export function setupSearch() {
    if (dom.searchInput) {
        dom.searchInput.oninput = async (e) => {
            const query = e.target.value.trim();
            if (!query) { dom.searchSuggestions.classList.add('hidden'); return; }
            try {
                const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                const suggestions = data[1] || [];
                dom.searchSuggestions.innerHTML = suggestions.map(s => `<li class="suggestion-item"><span>${s}</span></li>`).join('');
                dom.searchSuggestions.classList.toggle('hidden', suggestions.length === 0);
                dom.searchSuggestions.querySelectorAll('li').forEach(li => {
                    li.onclick = () => { dom.searchInput.value = li.textContent; dom.searchForm.requestSubmit(); };
                });
            } catch (err) { }
        };
        dom.searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = dom.searchInput.value.trim();
            if (!query) return;
            const url = getSearchUrl().replace('%s', encodeURIComponent(query));
            window.location.href = url;
        };
    }
}
