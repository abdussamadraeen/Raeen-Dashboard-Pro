import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { Search, BrainCircuit, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

export const SearchWidget: React.FC = () => {
  const settings = useDashboardStore((state) => state.settings);
  const showSearch = settings.showSearch;
  const searchEngine = settings.searchEngine;
  const customSearchUrl = settings.customSearchUrl;
  const showMainUI = settings.showMainUI;
  const backgroundType = settings.backgroundType;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resolveSearch = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return { url: '', engine: 'google', cleanQuery: '' };

    const urls: Record<string, string> = {
      google: 'https://www.google.com/search?q=%s',
      duckduckgo: 'https://duckduckgo.com/?q=%s',
      bing: 'https://www.bing.com/search?q=%s',
      brave: 'https://search.brave.com/search?q=%s',
      chatgpt: 'https://chatgpt.com/?q=%s',
      perplexity: 'https://www.perplexity.ai/search?q=%s',
      claude: 'https://claude.ai/?q=%s',
      gemini: 'https://gemini.google.com/app?q=%s',
    };

    if (searchEngine === 'custom_engine') {
      const base = customSearchUrl || 'https://www.google.com/search?q=%s';
      return { url: base.replace('%s', encodeURIComponent(query)), engine: 'custom', cleanQuery: query };
    }

    if (searchEngine !== 'robot_ai') {
      const base = urls[searchEngine] ?? urls['google'] ?? 'https://www.google.com/search?q=%s';
      return { url: base.replace('%s', encodeURIComponent(query)), engine: searchEngine, cleanQuery: query };
    }

    // --- Robot AI Router Logic ---
    let targetEngine = null;
    let cleanQuery = query;

    if (query.startsWith('/')) {
      const parts = query.split(/\s+/);
      const command = (parts[0] ?? "").toLowerCase();
      const rest = parts.slice(1).join(' ');

      const slashMap: Record<string, string> = {
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

    if (!targetEngine) {
      const lower = query.toLowerCase();
      const codingKeywords = [
        'code', 'run', 'error', 'bug', 'class', 'function', 'api', 'npm', 'git', 
        'python', 'javascript', 'typescript', 'rust', 'java', 'c++', 'html', 'css', 
        'sql', 'docker', 'kubernetes', 'json', 'compiler', 'syntax', 'array', 
        'hashmap', 'pointer', 'regex', 'install', 'setup', 'write a function',
        'programming', 'algorithm', 'binary search', 'recursion'
      ];

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

    const base = (targetEngine && urls[targetEngine]) || urls.google || "https://www.google.com/search?q=%s";
    return { url: base.replace('%s', encodeURIComponent(cleanQuery)), engine: targetEngine, cleanQuery };
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const { url } = resolveSearch(searchQuery);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let safeUrl = url.trim();
    if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
      safeUrl = `https://${safeUrl}`;
    }

    if (isMobile) {
      window.location.href = safeUrl;
    } else {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'open_tab', url: safeUrl });
      } else if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.sendMessage({ action: 'open_tab', url: safeUrl });
      } else {
        window.open(safeUrl, '_blank');
      }
    }

    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      let trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }

      // Strip slash commands prefix for suggesting autocomplete queries
      if (trimmed.startsWith('/')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length > 1) {
          trimmed = parts.slice(1).join(' ');
        } else {
          setSuggestions([]);
          return;
        }
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });
        const data = await res.json();
        const items = (data[1] || []).slice(0, 6);
        setSuggestions(items);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch suggestions:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      if (showSuggestions && query.trim()) {
        fetchSuggestions();
      } else {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, showSuggestions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % suggestions.length;
        if (suggestions[next]) setQuery(suggestions[next]!);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + suggestions.length) % suggestions.length;
        if (suggestions[next]) setQuery(suggestions[next]!);
        return next;
      });
    } else if (e.key === 'Enter') {
      // Form submission handles search, but prevent default if item selected to avoid double submit
      if (selectedIndex > -1) {
        e.preventDefault();
        if (suggestions[selectedIndex]) handleSearch(suggestions[selectedIndex]!);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const isLive = backgroundType === 'google_dashboard' || backgroundType === 'bing_dashboard';
  const hideUI = isLive;

  if (hideUI || !showSearch || !showMainUI) {
    return null;
  }

  // Choose placeholder and icon based on engine
  let enginePlaceholder = 'Search Google or ask AI...';
  let engineIcon = <Search className="w-5 h-5 text-white/50" aria-hidden="true" />;

  if (searchEngine === 'chatgpt') {
    enginePlaceholder = 'Ask ChatGPT...';
    engineIcon = <MessageSquare className="w-5 h-5 text-emerald-400" aria-hidden="true" />;
  } else if (searchEngine === 'perplexity') {
    enginePlaceholder = 'Ask Perplexity...';
    engineIcon = <BrainCircuit className="w-5 h-5 text-teal-400" aria-hidden="true" />;
  } else if (searchEngine === 'claude') {
    enginePlaceholder = 'Ask Claude...';
    engineIcon = <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />;
  } else if (searchEngine === 'bing') {
    enginePlaceholder = 'Search Bing...';
    engineIcon = <Sparkles className="w-5 h-5 text-blue-400" aria-hidden="true" />;
  } else if (searchEngine === 'duckduckgo') {
    enginePlaceholder = 'Search DuckDuckGo...';
  } else if (searchEngine === 'brave') {
    enginePlaceholder = 'Search Brave...';
  }

  return (
    <div
      ref={searchContainerRef}
      id="search-widget"
      className="search-container relative w-full max-w-xl mx-auto my-4 transition-all duration-300 z-[100]"
    >
      <form
        role="search"
        aria-label="Web search"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="w-full flex items-center glass-premium rounded-2xl border border-white/10 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] focus-within:border-accent focus-within:shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300"
      >
        <span className="mr-3 flex items-center justify-center">
          {isLoading ? <Loader2 className="w-5 h-5 text-white/50 animate-spin" aria-label="Loading suggestions" /> : engineIcon}
        </span>
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          aria-label="Search query"
          id="search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={enginePlaceholder}
          autoComplete="off"
          className="w-full bg-transparent border-none outline-none text-white text-base placeholder-white/40 focus:ring-0"
        />
        <div aria-live="polite" className="sr-only">
          {isLoading ? 'Loading suggestions' : showSuggestions && suggestions.length > 0 ? `${suggestions.length} suggestions available` : ''}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Search Suggestions"
          className="absolute left-0 right-0 mt-2 glass-premium rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSearch(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`suggestion-item flex items-center gap-3 px-4 py-3 text-white text-sm cursor-pointer transition-all duration-200 ${
                index === selectedIndex ? 'bg-white/10 border-l-4 border-accent pl-3' : 'bg-transparent border-l-4 border-transparent'
              }`}
            >
              <Search className="w-4 h-4 opacity-40 shrink-0" aria-hidden="true" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
