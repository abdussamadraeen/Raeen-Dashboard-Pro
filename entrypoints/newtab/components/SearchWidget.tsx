import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { Search, BrainCircuit, Sparkles, MessageSquare } from 'lucide-react';

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
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const getSearchUrl = (searchQuery: string) => {
    if (searchEngine === 'custom_engine') {
      return (customSearchUrl || 'https://www.google.com/search?q=%s').replace('%s', encodeURIComponent(searchQuery));
    }
    const urls: Record<string, string> = {
      google: 'https://www.google.com/search?q=%s',
      duckduckgo: 'https://duckduckgo.com/?q=%s',
      bing: 'https://www.bing.com/search?q=%s',
      brave: 'https://search.brave.com/search?q=%s',
      chatgpt: 'https://chatgpt.com/?q=%s',
      perplexity: 'https://www.perplexity.ai/search?q=%s',
    };
    return (urls[searchEngine] || urls.google).replace('%s', encodeURIComponent(searchQuery));
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const url = getSearchUrl(searchQuery);
    
    // Smooth navigation experience: redirect current tab on mobile, open new tab on desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        const items = (data[1] || []).slice(0, 6);
        setSuggestions(items);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (showSuggestions && query.trim()) {
        fetchSuggestions();
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
        setQuery(suggestions[next]);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + suggestions.length) % suggestions.length;
        setQuery(suggestions[next]);
        return next;
      });
    } else if (e.key === 'Enter') {
      // Form submission handles search, but prevent default if item selected to avoid double submit
      if (selectedIndex > -1) {
        e.preventDefault();
        handleSearch(suggestions[selectedIndex]);
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
  let engineIcon = <Search className="w-5 h-5 text-white/50" />;

  if (searchEngine === 'chatgpt') {
    enginePlaceholder = 'Ask ChatGPT...';
    engineIcon = <MessageSquare className="w-5 h-5 text-emerald-400" />;
  } else if (searchEngine === 'perplexity') {
    enginePlaceholder = 'Ask Perplexity...';
    engineIcon = <BrainCircuit className="w-5 h-5 text-teal-400" />;
  } else if (searchEngine === 'bing') {
    enginePlaceholder = 'Search Bing...';
    engineIcon = <Sparkles className="w-5 h-5 text-blue-400" />;
  } else if (searchEngine === 'duckduckgo') {
    enginePlaceholder = 'Search DuckDuckGo...';
  } else if (searchEngine === 'brave') {
    enginePlaceholder = 'Search Brave...';
  }

  return (
    <div
      ref={searchContainerRef}
      id="search-widget"
      className="search-container relative w-full max-w-xl mx-auto my-4 transition-all duration-300 z-40"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="w-full flex items-center glass-premium rounded-2xl border border-white/10 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] focus-within:border-accent focus-within:shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300"
      >
        <span className="mr-3">{engineIcon}</span>
        <input
          type="text"
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
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          className="absolute left-0 right-0 mt-2 glass-premium rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSearch(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`suggestion-item flex items-center gap-3 px-4 py-3 text-white text-sm cursor-pointer transition-all duration-200 ${
                index === selectedIndex ? 'bg-white/10 border-l-4 border-accent pl-3' : 'bg-transparent border-l-4 border-transparent'
              }`}
            >
              <Search className="w-4 h-4 opacity-40 shrink-0" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
