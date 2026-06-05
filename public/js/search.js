import { state as i } from "./state.js";
import { dom as e } from "./dom.js";
import { escapeHTML as sHtml, debounce as dnce } from "./security.js";
import { applySettings as apply } from "./ui.js";

const LABELS = {
    google: "Google",
    duckduckgo: "DuckDuckGo",
    bing: "Bing",
    brave: "Brave",
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    gemini: "Gemini",
    claude: "Claude",
    copilot: "Copilot",
    custom_engine: "Custom Engine"
};

export function getEngineLabel(engine) {
    return LABELS[engine] || engine;
}

export function getSearchUrl(engine) {
    const n = engine || i.settings.searchEngine;
    if (n === "custom_engine") {
        return i.settings.customSearchUrl || "https://www.google.com/search?q=%s";
    }
    const o = {
        google: "https://www.google.com/search?q=%s",
        duckduckgo: "https://duckduckgo.com/?q=%s",
        bing: "https://www.bing.com/search?q=%s",
        brave: "https://search.brave.com/search?q=%s",
        chatgpt: "https://chatgpt.com/?q=%s",
        perplexity: "https://www.perplexity.ai/search?q=%s",
        gemini: "https://gemini.google.com/app?q=%s",
        claude: "https://claude.ai/?q=%s",
        copilot: "https://copilot.microsoft.com/?q=%s"
    };
    return o[n] || o.google;
}

export function routeQuery(query) {
    const q = query.trim().toLowerCase();
    const getManualQuery = () => {
        const spaceIdx = query.indexOf(" ");
        return spaceIdx > -1 ? query.substring(spaceIdx + 1) : "";
    };
    
    // 1. Explicit command overrides
    if (q === "/gpt" || q === "/chatgpt" || q.startsWith("/gpt ") || q.startsWith("/chatgpt ")) {
        return { engine: "chatgpt", query: getManualQuery(), reason: "Manual ChatGPT Route" };
    }
    if (q === "/gemini" || q === "/gem" || q.startsWith("/gemini ") || q.startsWith("/gem ")) {
        return { engine: "gemini", query: getManualQuery(), reason: "Manual Gemini Route" };
    }
    if (q === "/claude" || q.startsWith("/claude ")) {
        return { engine: "claude", query: getManualQuery(), reason: "Manual Claude Route" };
    }
    if (q === "/copilot" || q === "/cop" || q.startsWith("/copilot ") || q.startsWith("/cop ")) {
        return { engine: "copilot", query: getManualQuery(), reason: "Manual Copilot Route" };
    }
    if (q === "/perplexity" || q === "/perp" || q.startsWith("/perplexity ") || q.startsWith("/perp ")) {
        return { engine: "perplexity", query: getManualQuery(), reason: "Manual Perplexity Route" };
    }
    if (q === "/google" || q === "/g" || q.startsWith("/google ") || q.startsWith("/g ")) {
        return { engine: "google", query: getManualQuery(), reason: "Manual Google Route" };
    }
    if (q === "/bing" || q === "/b" || q.startsWith("/bing ") || q.startsWith("/b ")) {
        return { engine: "bing", query: getManualQuery(), reason: "Manual Bing Route" };
    }
    if (q === "/ddg" || q === "/duckduckgo" || q.startsWith("/ddg ") || q.startsWith("/duckduckgo ")) {
        return { engine: "duckduckgo", query: getManualQuery(), reason: "Manual DuckDuckGo Route" };
    }
    if (q === "/brave" || q.startsWith("/brave ")) {
        return { engine: "brave", query: getManualQuery(), reason: "Manual Brave Route" };
    }

    // 2. Intent Heuristics
    // Coding / Debugging -> Claude
    if (/\b(code|function|class|javascript|python|java|rust|html|css|c\+\+|sql|regex|git|api|compiler|script|algorithm|bug|error|exception|async|promise|undefined|null|object|array|loop|binary)\b/i.test(q)) {
        return { engine: "claude", query, reason: "Coding/Technical Query" };
    }
    // News / Realtime / Current -> Perplexity
    if (/\b(latest|news|weather|current|recent|vs|versus|compare|difference between|price of|stock|flight|hotel|map|location|population|statistics)\b/i.test(q)) {
        return { engine: "perplexity", query, reason: "Research & Real-time Info" };
    }
    // General creative writing -> ChatGPT
    if (/\b(write|draft|essay|email|poem|song|story|explain|summarize|translate|suggest|list|ideas|how to ask|congratulations|letter)\b/i.test(q)) {
        return { engine: "chatgpt", query, reason: "Creative & Reasoning Query" };
    }

    // Default: Google Search
    return { engine: "google", query, reason: "Factual Search" };
}

export function setupSearch() {
    let selectedIndex = -1;

    if (e.searchInput) {
        const updateSelection = (items) => {
            items.forEach((s, a) => {
                s.classList.toggle("selected", a === selectedIndex);
                if (a === selectedIndex) {
                    if (!s.classList.contains("robot-route-item")) {
                        e.searchInput.value = s.querySelector("span").textContent;
                    }
                }
            });
        };

        const handleSearch = (query) => {
            if (!query) return;
            let engine = i.settings.searchEngine;
            let finalQuery = query;

            if (engine === "robot_ai") {
                const route = routeQuery(query);
                engine = route.engine;
                finalQuery = route.query;
            }

            if (engine === "google" || engine === "bing") {
                i.settings.backgroundType = `${engine}_dashboard`;
                i.settings.backgroundValue = engine === "google"
                    ? `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}&raeen_dashboard=true`
                    : `https://www.bing.com/search?q=${encodeURIComponent(finalQuery)}&raeen_dashboard=true`;
                apply();
            } else {
                const url = getSearchUrl(engine).replace("%s", encodeURIComponent(finalQuery));
                window.open(url, "_blank");
            }
        };

        const fetchSuggestions = dnce(async (query) => {
            try {
                const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                const suggestions = (data[1] || []).slice(0, 6);
                
                let suggestionsHTML = "";
                if (i.settings.searchEngine === "robot_ai" && query) {
                    const route = routeQuery(query);
                    const label = getEngineLabel(route.engine);
                    suggestionsHTML += `
                        <li class="suggestion-item robot-route-item" style="border-bottom: 1px solid var(--glass-border); background: rgba(123, 97, 255, 0.08);">
                            <svg viewBox="0 0 24 24" width="16" height="16" style="color: #a78bfa; flex-shrink: 0;">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" fill="currentColor"/>
                            </svg>
                            <span style="font-weight: 500; color: #c084fc;">🤖 Route to ${label} <span style="font-size:0.75rem; font-weight:normal; opacity:0.7;">(${route.reason})</span></span>
                        </li>
                    `;
                }

                suggestionsHTML += suggestions.map((c, g) => `
                    <li class="suggestion-item" data-index="${g}">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="opacity:0.5; flex-shrink: 0;">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                        </svg>
                        <span>${sHtml(c)}</span>
                    </li>
                `).join("");
                
                e.searchSuggestions.innerHTML = suggestionsHTML;
                e.searchSuggestions.classList.toggle("hidden", suggestions.length === 0 && i.settings.searchEngine !== "robot_ai");
            } catch (err) {
                console.error("Suggestions fetch error:", err);
            }
        }, 150);

        e.searchSuggestions.onclick = (t) => {
            const s = t.target.closest("li");
            if (s && e.searchSuggestions.contains(s)) {
                if (s.classList.contains("robot-route-item")) {
                    e.searchForm.requestSubmit();
                    return;
                }
                e.searchInput.value = s.querySelector("span").textContent;
                e.searchForm.requestSubmit();
            }
        };

        e.searchInput.oninput = (t) => {
            const s = t.target.value.trim();
            selectedIndex = -1;
            if (!s) {
                e.searchSuggestions.classList.add("hidden");
                return;
            }
            fetchSuggestions(s);
            if (i.settings.searchEngine === "robot_ai") {
                const route = routeQuery(s);
                const label = getEngineLabel(route.engine);
                e.searchSuggestions.innerHTML = `
                    <li class="suggestion-item robot-route-item" style="border-bottom: 1px solid var(--glass-border); background: rgba(123, 97, 255, 0.08);">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="color: #a78bfa; flex-shrink: 0;">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" fill="currentColor"/>
                        </svg>
                        <span style="font-weight: 500; color: #c084fc;">🤖 Route to ${label} <span style="font-size:0.75rem; font-weight:normal; opacity:0.7;">(${route.reason})</span></span>
                    </li>
                `;
                e.searchSuggestions.classList.remove("hidden");
            }
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
                const selectedEl = s[selectedIndex];
                if (!selectedEl.classList.contains("robot-route-item")) {
                    e.searchInput.value = selectedEl.querySelector("span").textContent;
                }
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
