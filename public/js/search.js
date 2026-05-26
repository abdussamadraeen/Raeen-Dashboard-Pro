import { state as i } from "./state.js";
import { dom as e } from "./dom.js";
import { escapeHTML as sHtml, debounce as dnce } from "./security.js";

export function getSearchUrl() {
    const n = i.settings.searchEngine;
    if (n === "custom_engine") {
        return i.settings.customSearchUrl || "https://www.google.com/search?q=%s";
    }
    const o = {
        google: "https://www.google.com/search?q=%s",
        duckduckgo: "https://duckduckgo.com/?q=%s",
        bing: "https://www.bing.com/search?q=%s",
        brave: "https://search.brave.com/search?q=%s",
        chatgpt: "https://chatgpt.com/?q=%s",
        perplexity: "https://www.perplexity.ai/search?q=%s"
    };
    return o[n] || o.google;
}

export function setupSearch() {
    let selectedIndex = -1;

    if (e.searchInput) {
        const updateSelection = (items) => {
            items.forEach((s, a) => {
                s.classList.toggle("selected", a === selectedIndex);
                if (a === selectedIndex) {
                    e.searchInput.value = s.querySelector("span").textContent;
                }
            });
        };

        const handleSearch = (query) => {
            if (!query) return;
            const url = getSearchUrl().replace("%s", encodeURIComponent(query));
            window.open(url, "_blank");
        };

        const fetchSuggestions = dnce(async (query) => {
            try {
                const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                const suggestions = (data[1] || []).slice(0, 6);
                
                e.searchSuggestions.innerHTML = suggestions.map((c, g) => `
                    <li class="suggestion-item" data-index="${g}">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="opacity:0.5">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                        </svg>
                        <span>${sHtml(c)}</span>
                    </li>
                `).join("");
                
                e.searchSuggestions.classList.toggle("hidden", suggestions.length === 0);
                
                e.searchSuggestions.querySelectorAll("li").forEach(li => {
                    li.onclick = () => {
                        e.searchInput.value = li.querySelector("span").textContent;
                        e.searchForm.requestSubmit();
                    };
                });
            } catch (err) {
                console.error("Suggestions fetch error:", err);
            }
        }, 150);

        e.searchInput.oninput = (t) => {
            const s = t.target.value.trim();
            selectedIndex = -1;
            if (!s) {
                e.searchSuggestions.classList.add("hidden");
                return;
            }
            fetchSuggestions(s);
        };

        e.searchInput.onkeydown = (t) => {
            const s = e.searchSuggestions.querySelectorAll(".suggestion-item");
            if (s.length === 0) return;

            if (t.key === "ArrowDown") {
                t.preventDefault();
                selectedIndex = (selectedIndex + 1) % s.length;
                updateSelection(s);
            } else if (t.key === "ArrowUp") {
                t.preventDefault();
                selectedIndex = (selectedIndex - 1 + s.length) % s.length;
                updateSelection(s);
            } else if (t.key === "Enter" && selectedIndex > -1) {
                t.preventDefault();
                e.searchInput.value = s[selectedIndex].querySelector("span").textContent;
                e.searchForm.requestSubmit();
            } else if (t.key === "Escape") {
                e.searchSuggestions.classList.add("hidden");
            }
        };

        e.searchForm.onsubmit = (t) => {
            t.preventDefault();
            const s = e.searchInput.value.trim();
            handleSearch(s);
            e.searchInput.value = "";
            e.searchSuggestions.classList.add("hidden");
        };

        document.addEventListener("click", (t) => {
            if (!e.searchContainer.contains(t.target)) {
                e.searchSuggestions.classList.add("hidden");
            }
        });
    }
}
