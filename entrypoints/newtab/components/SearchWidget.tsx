import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import {
  Search,
  BrainCircuit,
  Sparkles,
  MessageSquare,
  Loader2,
  Calculator,
  Layers,
  Bookmark,
  History,
  FileText,
  LayoutGrid,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import {
  queryOmniscientSearch,
  type OmniscientResult,
  SLASH_COMMANDS,
} from '../../../lib/omniscientSearch';
import { StorageManager } from '../../../store/storage';

const ENGINE_URLS: Record<string, string> = {
  google: 'https://www.google.com/search?q=%s',
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
  brave: 'https://search.brave.com/search?q=%s',
  chatgpt: 'https://chatgpt.com/?q=%s',
  perplexity: 'https://www.perplexity.ai/search?q=%s',
  claude: 'https://claude.ai/?q=%s',
  gemini: 'https://gemini.google.com/app?q=%s',
  github: 'https://github.com/search?q=%s',
  youtube: 'https://www.youtube.com/results?search_query=%s',
  wikipedia: 'https://en.wikipedia.org/wiki/Special:Search?search=%s',
  reddit: 'https://www.reddit.com/search/?q=%s',
  stackoverflow: 'https://stackoverflow.com/search?q=%s',
};

export const SearchWidget: React.FC = () => {
  const settings = useDashboardStore((state) => state.settings);
  const showSearch = settings.showSearch;
  const searchEngine = settings.searchEngine;
  const customSearchUrl = settings.customSearchUrl;
  const showMainUI = settings.showMainUI;
  const backgroundType = settings.backgroundType;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmniscientResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resolveSearch = useCallback((rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return { url: '', engine: 'google', cleanQuery: '' };

    if (searchEngine === 'custom_engine') {
      const base = customSearchUrl || ENGINE_URLS['google']!;
      return { url: base.replace('%s', encodeURIComponent(trimmed)), engine: 'custom', cleanQuery: trimmed };
    }

    // 1. Direct Slash Command routing
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const cmd = (parts[0] ?? '').toLowerCase();
      const rest = parts.slice(1).join(' ').trim();
      const slashInfo = SLASH_COMMANDS[cmd];

      if (slashInfo && slashInfo.searchUrl) {
        return {
          url: slashInfo.searchUrl.replace('%s', encodeURIComponent(rest || '')),
          engine: slashInfo.engine,
          cleanQuery: rest,
        };
      }
    }

    // 2. Specific engine or Robot AI auto-router
    if (searchEngine !== 'robot_ai') {
      const base = ENGINE_URLS[searchEngine] ?? ENGINE_URLS['google']!;
      return { url: base.replace('%s', encodeURIComponent(trimmed)), engine: searchEngine, cleanQuery: trimmed };
    }

    // Robot AI heuristics
    const lower = trimmed.toLowerCase();
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

    let targetEngine = 'google';
    if (codingKeywords.some((kw) => lower.includes(kw))) {
      targetEngine = 'claude';
    } else if (researchKeywords.some((kw) => lower.includes(kw)) || trimmed.split(/\s+/).length >= 6) {
      targetEngine = 'perplexity';
    }

    const base = ENGINE_URLS[targetEngine] ?? ENGINE_URLS['google']!;
    return { url: base.replace('%s', encodeURIComponent(trimmed)), engine: targetEngine, cleanQuery: trimmed };
  }, [searchEngine, customSearchUrl]);

  const navigateUrl = useCallback((url: string) => {
    let safeUrl = url.trim();
    if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
      safeUrl = `https://${safeUrl}`;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = safeUrl;
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'open_tab', url: safeUrl });
    } else if (typeof browser !== 'undefined' && (browser as any).runtime) {
      (browser as any).runtime.sendMessage({ action: 'open_tab', url: safeUrl });
    } else {
      window.open(safeUrl, '_blank');
    }
  }, []);

  const handleSelectResult = useCallback((item: OmniscientResult) => {
    // A. Switch to Tab
    if (item.type === 'tab' && item.tabId) {
      if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
        chrome.tabs.update(item.tabId, { active: true });
        if (item.windowId && chrome.windows?.update) {
          chrome.windows.update(item.windowId, { focused: true });
        }
      } else if (item.url) {
        navigateUrl(item.url);
      }
      setShowSuggestions(false);
      setQuery('');
      return;
    }

    // B. Direct URL navigation (Bookmark, History, App)
    if ((item.type === 'bookmark' || item.type === 'history' || item.type === 'app') && item.url) {
      navigateUrl(item.url);
      setShowSuggestions(false);
      setQuery('');
      return;
    }

    // C. Calculation answer: populate or copy
    if (item.type === 'calc') {
      try {
        navigator.clipboard?.writeText(item.value);
      } catch {
        // ignore clipboard error
      }
      setQuery(item.value);
      setShowSuggestions(false);
      return;
    }

    // D. Slash command suggestion: populate command prefix
    if (item.type === 'slash' && item.value.startsWith('/')) {
      setQuery(item.value);
      setShowSuggestions(true);
      inputRef.current?.focus();
      return;
    }

    // E. General web search
    const { url } = resolveSearch(item.value);
    navigateUrl(url);
    setShowSuggestions(false);
    setQuery('');
  }, [navigateUrl, resolveSearch]);

  const handleSearchSubmit = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    if (selectedIndex > -1 && results[selectedIndex]) {
      handleSelectResult(results[selectedIndex]!);
      return;
    }

    const { url } = resolveSearch(trimmed);
    navigateUrl(url);
    setQuery('');
    setResults([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [selectedIndex, results, handleSelectResult, resolveSearch, navigateUrl]);

  // Omniscient Suggestion Fetcher with LRU & Cancellation
  useEffect(() => {
    const fetchOmniscient = async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const notes = (await StorageManager.getAll('notes').catch(() => [])) as Array<{ id: string; title: string; body?: string }>;
        const apps = (((settings as any).shortcuts || (settings as any).apps || []) as Array<{ name: string; url: string }>);

        const searchResults = await queryOmniscientSearch({
          query: trimmed,
          signal: controller.signal,
          sources: { notes, apps },
          currentEngine: searchEngine,
          customSearchUrl,
        });

        if (!controller.signal.aborted) {
          setResults(searchResults);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[OmniscientSearch] Query failed:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      if (showSuggestions && query.trim()) {
        fetchOmniscient();
      } else {
        setIsLoading(false);
      }
    }, 120);

    return () => clearTimeout(debounceTimer);
  }, [query, showSuggestions, searchEngine, customSearchUrl]);

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
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % results.length;
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + results.length) % results.length;
        return next;
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = selectedIndex > -1 ? results[selectedIndex] : results[0];
      if (target) {
        setQuery(target.value);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const isLive = backgroundType === 'google_dashboard' || backgroundType === 'bing_dashboard';
  if (isLive || !showSearch || !showMainUI) {
    return null;
  }

  let enginePlaceholder = 'Search the universe, calculate, or type / for commands...';
  let engineIcon = <Search className="w-5 h-5 text-white/50" aria-hidden="true" />;

  if (searchEngine === 'chatgpt') {
    enginePlaceholder = 'Ask ChatGPT or type / for engines...';
    engineIcon = <MessageSquare className="w-5 h-5 text-emerald-400" aria-hidden="true" />;
  } else if (searchEngine === 'perplexity') {
    enginePlaceholder = 'Ask Perplexity or type / for engines...';
    engineIcon = <BrainCircuit className="w-5 h-5 text-teal-400" aria-hidden="true" />;
  } else if (searchEngine === 'claude') {
    enginePlaceholder = 'Talk with Claude or type / for engines...';
    engineIcon = <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />;
  } else if (searchEngine === 'bing') {
    enginePlaceholder = 'Search Microsoft Bing...';
    engineIcon = <Sparkles className="w-5 h-5 text-blue-400" aria-hidden="true" />;
  }

  const renderResultIcon = (item: OmniscientResult) => {
    switch (item.type) {
      case 'calc':
        return <Calculator className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />;
      case 'tab':
        return <Layers className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />;
      case 'bookmark':
        return <Bookmark className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />;
      case 'history':
        return <History className="w-4 h-4 text-purple-400 shrink-0" aria-hidden="true" />;
      case 'note':
        return <FileText className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />;
      case 'app':
        return <LayoutGrid className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />;
      case 'slash':
        return <Terminal className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />;
      default:
        return <Search className="w-4 h-4 text-white/40 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div
      ref={searchContainerRef}
      id="search-widget"
      className="search-container relative w-full max-w-2xl mx-auto my-4 transition-all duration-300 z-[100]"
    >
      <form
        role="search"
        aria-label="Omniscient search"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchSubmit(query);
        }}
        className="w-full flex items-center glass-premium rounded-2xl border border-white/10 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.25)] focus-within:border-accent focus-within:shadow-[0_0_24px_var(--accent-glow)] transition-all duration-300"
      >
        <span className="mr-3 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" aria-label="Searching..." />
          ) : (
            engineIcon
          )}
        </span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && results.length > 0}
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
          spellCheck="false"
          className="w-full bg-transparent border-none outline-none text-white text-base placeholder-white/40 focus:ring-0"
        />
        <div aria-live="polite" className="sr-only">
          {isLoading
            ? 'Searching universe...'
            : showSuggestions && results.length > 0
            ? `${results.length} results available`
            : ''}
        </div>
      </form>

      {showSuggestions && results.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Search Suggestions"
          className="absolute left-0 right-0 mt-2 glass-premium rounded-2xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden divide-y divide-white/5 backdrop-blur-2xl"
        >
          {results.map((item, index) => (
            <li
              key={item.id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelectResult(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`suggestion-item flex items-center justify-between gap-3 px-4 py-3 text-white text-sm cursor-pointer transition-all duration-150 ${
                index === selectedIndex
                  ? 'bg-white/15 border-l-4 border-accent pl-3'
                  : 'bg-transparent border-l-4 border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                {renderResultIcon(item)}
                <div className="flex flex-col min-w-0">
                  <span className={`truncate ${item.isCalculated ? 'font-mono font-semibold text-emerald-300 text-base' : 'font-medium'}`}>
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-xs text-white/50 truncate max-w-md">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </div>
              {item.badge && (
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 flex items-center gap-1">
                  {item.badge}
                  {item.type === 'tab' && <ArrowRight className="w-3 h-3 opacity-60" />}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
