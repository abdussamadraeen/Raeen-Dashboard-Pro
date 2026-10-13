/**
 * Omniscient Search & Information Retrieval Engine ("Search Like God")
 * 
 * Inspired by the architectural philosophy of:
 * - Larry Page & Sergey Brin: Unified relevance scoring, instant prefetching, multi-engine routing.
 * - Doug Cutting (Apache Lucene): Tokenized search, prefix indexing, multi-source document retrieval.
 * - Donald Knuth (TAOCP): Bounded LRU cache, optimal string matching, deterministic memory bounds.
 * - Stephen Wolfram: Zero-eval recursive-descent math parser, unit conversions, and inline symbolic evaluation.
 * - Linus Torvalds: Resilient fail-safe isolation, zero crashes, graceful degradation across browser APIs.
 * - Rust Memory Model: Bounded memory footprint, zero leaks, deterministic lifecycle cleanup.
 */

export type OmniscientResultType = 
  | 'calc'        // Calculator / Unit conversion
  | 'tab'         // Open browser tab (Switch to tab)
  | 'bookmark'    // Browser bookmark
  | 'history'     // Browser history
  | 'note'        // Local saved workspace note
  | 'app'         // Quick shortcut / application
  | 'slash'       // Slash command recommendation
  | 'web';        // Web search suggestion

export interface OmniscientResult {
  id: string;
  type: OmniscientResultType;
  title: string;
  subtitle?: string;
  value: string;
  badge?: string;
  tabId?: number;
  windowId?: number;
  url?: string;
  isCalculated?: boolean;
}

// ─── 1. Bounded LRU Cache (Rust-style zero-leak bounded memory) ───
export class BoundedLRUCache<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity = 150) {
    this.capacity = capacity;
    this.map = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    // Re-insert to mark as most recently used
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// ─── 2. Safe Zero-Eval Math & Symbolic Parser (Stephen Wolfram grade) ───
export interface MathEvaluationResult {
  expression: string;
  result: string;
  type: 'math' | 'unit' | 'currency' | 'base';
}

const UNIT_CONVERSIONS: Record<string, { base: string; factor: number; category: string }> = {
  // Length (base: meter)
  m: { base: 'm', factor: 1, category: 'length' },
  meter: { base: 'm', factor: 1, category: 'length' },
  meters: { base: 'm', factor: 1, category: 'length' },
  km: { base: 'm', factor: 1000, category: 'length' },
  kilometer: { base: 'm', factor: 1000, category: 'length' },
  kilometers: { base: 'm', factor: 1000, category: 'length' },
  cm: { base: 'm', factor: 0.01, category: 'length' },
  centimeter: { base: 'm', factor: 0.01, category: 'length' },
  centimeters: { base: 'm', factor: 0.01, category: 'length' },
  mm: { base: 'm', factor: 0.001, category: 'length' },
  millimeter: { base: 'm', factor: 0.001, category: 'length' },
  millimeters: { base: 'm', factor: 0.001, category: 'length' },
  mi: { base: 'm', factor: 1609.344, category: 'length' },
  mile: { base: 'm', factor: 1609.344, category: 'length' },
  miles: { base: 'm', factor: 1609.344, category: 'length' },
  yd: { base: 'm', factor: 0.9144, category: 'length' },
  yard: { base: 'm', factor: 0.9144, category: 'length' },
  yards: { base: 'm', factor: 0.9144, category: 'length' },
  ft: { base: 'm', factor: 0.3048, category: 'length' },
  foot: { base: 'm', factor: 0.3048, category: 'length' },
  feet: { base: 'm', factor: 0.3048, category: 'length' },
  in: { base: 'm', factor: 0.0254, category: 'length' },
  inch: { base: 'm', factor: 0.0254, category: 'length' },
  inches: { base: 'm', factor: 0.0254, category: 'length' },

  // Mass (base: kg)
  kg: { base: 'kg', factor: 1, category: 'mass' },
  kilogram: { base: 'kg', factor: 1, category: 'mass' },
  kilograms: { base: 'kg', factor: 1, category: 'mass' },
  g: { base: 'kg', factor: 0.001, category: 'mass' },
  gram: { base: 'kg', factor: 0.001, category: 'mass' },
  grams: { base: 'kg', factor: 0.001, category: 'mass' },
  mg: { base: 'kg', factor: 0.000001, category: 'mass' },
  milligram: { base: 'kg', factor: 0.000001, category: 'mass' },
  milligrams: { base: 'kg', factor: 0.000001, category: 'mass' },
  lb: { base: 'kg', factor: 0.45359237, category: 'mass' },
  lbs: { base: 'kg', factor: 0.45359237, category: 'mass' },
  pound: { base: 'kg', factor: 0.45359237, category: 'mass' },
  pounds: { base: 'kg', factor: 0.45359237, category: 'mass' },
  oz: { base: 'kg', factor: 0.028349523125, category: 'mass' },
  ounce: { base: 'kg', factor: 0.028349523125, category: 'mass' },
  ounces: { base: 'kg', factor: 0.028349523125, category: 'mass' },
  ton: { base: 'kg', factor: 1000, category: 'mass' },
  tons: { base: 'kg', factor: 1000, category: 'mass' },

  // Digital Storage (base: bytes)
  b: { base: 'b', factor: 1, category: 'storage' },
  byte: { base: 'b', factor: 1, category: 'storage' },
  bytes: { base: 'b', factor: 1, category: 'storage' },
  kb: { base: 'b', factor: 1024, category: 'storage' },
  kilobyte: { base: 'b', factor: 1024, category: 'storage' },
  kilobytes: { base: 'b', factor: 1024, category: 'storage' },
  mb: { base: 'b', factor: 1024 * 1024, category: 'storage' },
  megabyte: { base: 'b', factor: 1024 * 1024, category: 'storage' },
  megabytes: { base: 'b', factor: 1024 * 1024, category: 'storage' },
  gb: { base: 'b', factor: 1024 * 1024 * 1024, category: 'storage' },
  gigabyte: { base: 'b', factor: 1024 * 1024 * 1024, category: 'storage' },
  gigabytes: { base: 'b', factor: 1024 * 1024 * 1024, category: 'storage' },
  tb: { base: 'b', factor: 1024 * 1024 * 1024 * 1024, category: 'storage' },
  terabyte: { base: 'b', factor: 1024 * 1024 * 1024 * 1024, category: 'storage' },
  terabytes: { base: 'b', factor: 1024 * 1024 * 1024 * 1024, category: 'storage' },

  // Time (base: seconds)
  s: { base: 's', factor: 1, category: 'time' },
  sec: { base: 's', factor: 1, category: 'time' },
  second: { base: 's', factor: 1, category: 'time' },
  seconds: { base: 's', factor: 1, category: 'time' },
  ms: { base: 's', factor: 0.001, category: 'time' },
  min: { base: 's', factor: 60, category: 'time' },
  mins: { base: 's', factor: 60, category: 'time' },
  minute: { base: 's', factor: 60, category: 'time' },
  minutes: { base: 's', factor: 60, category: 'time' },
  hr: { base: 's', factor: 3600, category: 'time' },
  hrs: { base: 's', factor: 3600, category: 'time' },
  hour: { base: 's', factor: 3600, category: 'time' },
  hours: { base: 's', factor: 3600, category: 'time' },
  d: { base: 's', factor: 86400, category: 'time' },
  day: { base: 's', factor: 86400, category: 'time' },
  days: { base: 's', factor: 86400, category: 'time' },
  wk: { base: 's', factor: 604800, category: 'time' },
  week: { base: 's', factor: 604800, category: 'time' },
  weeks: { base: 's', factor: 604800, category: 'time' },
};

// Fixed baseline FX rates for instant conversion (relative to USD)
const CURRENCY_RATES: Record<string, number> = {
  usd: 1.0,
  eur: 0.92,
  gbp: 0.79,
  jpy: 154.5,
  inr: 86.8,
  cad: 1.38,
  aud: 1.52,
  chf: 0.88,
  cny: 7.25,
};

export function evaluateExpression(raw: string): MathEvaluationResult | null {
  const query = raw.trim().toLowerCase();
  if (!query || query.length > 120) return null;

  // 1. Check for Base Conversions: e.g. "255 in hex", "0xff in dec", "12 in binary"
  const baseMatch = query.match(/^([0-9a-fxob]+)\s+(?:in|to)\s+(hex|decimal|dec|binary|bin|octal|oct)$/);
  if (baseMatch) {
    const valStr = baseMatch[1] ?? '';
    const targetBase = baseMatch[2] ?? '';
    let num: number = NaN;
    if (valStr.startsWith('0x')) num = parseInt(valStr.slice(2), 16);
    else if (valStr.startsWith('0b')) num = parseInt(valStr.slice(2), 2);
    else if (valStr.startsWith('0o')) num = parseInt(valStr.slice(2), 8);
    else num = parseInt(valStr, 10);

    if (!isNaN(num)) {
      if (targetBase === 'hex') return { expression: query, result: `0x${num.toString(16).toUpperCase()}`, type: 'base' };
      if (targetBase === 'dec' || targetBase === 'decimal') return { expression: query, result: num.toString(10), type: 'base' };
      if (targetBase === 'bin' || targetBase === 'binary') return { expression: query, result: `0b${num.toString(2)}`, type: 'base' };
      if (targetBase === 'oct' || targetBase === 'octal') return { expression: query, result: `0o${num.toString(8)}`, type: 'base' };
    }
  }

  // 2. Check for Unit Conversions: e.g. "10 km to miles", "100 usd to eur"
  const unitMatch = query.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-z°/]+)\s+(?:to|in)\s+([a-z°/]+)$/);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1] ?? '0');
    const fromUnit = (unitMatch[2] ?? '').replace('°', '');
    const toUnit = (unitMatch[3] ?? '').replace('°', '');

    // Temperature special case
    if (['c', 'celsius'].includes(fromUnit) && ['f', 'fahrenheit'].includes(toUnit)) {
      const res = (val * 9) / 5 + 32;
      return { expression: query, result: `${Math.round(res * 100) / 100} °F`, type: 'unit' };
    }
    if (['f', 'fahrenheit'].includes(fromUnit) && ['c', 'celsius'].includes(toUnit)) {
      const res = ((val - 32) * 5) / 9;
      return { expression: query, result: `${Math.round(res * 100) / 100} °C`, type: 'unit' };
    }
    if (['c', 'celsius'].includes(fromUnit) && ['k', 'kelvin'].includes(toUnit)) {
      const res = val + 273.15;
      return { expression: query, result: `${Math.round(res * 100) / 100} K`, type: 'unit' };
    }

    // Standard physical units
    const uFrom = UNIT_CONVERSIONS[fromUnit];
    const uTo = UNIT_CONVERSIONS[toUnit];
    if (uFrom && uTo && uFrom.category === uTo.category) {
      const inBase = val * uFrom.factor;
      const res = inBase / uTo.factor;
      const formatted = res < 0.001 ? res.toExponential(4) : (Math.round(res * 10000) / 10000).toLocaleString();
      return { expression: query, result: `${formatted} ${toUnit}`, type: 'unit' };
    }

    // Currency conversions
    const rFrom = CURRENCY_RATES[fromUnit];
    const rTo = CURRENCY_RATES[toUnit];
    if (rFrom && rTo) {
      const inUsd = val / rFrom;
      const res = inUsd * rTo;
      return { expression: query, result: `${(Math.round(res * 100) / 100).toLocaleString()} ${toUnit.toUpperCase()}`, type: 'currency' };
    }
  }

  // 3. Percentage: e.g. "15% of 250" or "20% off 100"
  const percentOfMatch = query.match(/^([0-9]+(?:\.[0-9]+)?)\s*%\s+of\s+([0-9]+(?:\.[0-9]+)?)$/);
  if (percentOfMatch) {
    const pct = parseFloat(percentOfMatch[1] ?? '0');
    const total = parseFloat(percentOfMatch[2] ?? '0');
    const res = (pct / 100) * total;
    return { expression: query, result: `${Math.round(res * 10000) / 10000}`, type: 'math' };
  }

  const percentOffMatch = query.match(/^([0-9]+(?:\.[0-9]+)?)\s*%\s+off\s+([0-9]+(?:\.[0-9]+)?)$/);
  if (percentOffMatch) {
    const pct = parseFloat(percentOffMatch[1] ?? '0');
    const total = parseFloat(percentOffMatch[2] ?? '0');
    const res = total - (pct / 100) * total;
    return { expression: query, result: `${Math.round(res * 10000) / 10000}`, type: 'math' };
  }

  // 4. Pure Mathematical Expression
  // Discard queries that clearly aren't math (letters other than math functions & constants)
  const allowedTokens = /^[0-9\s+\-*/%^().,piea-z]+$/;
  if (!allowedTokens.test(query)) return null;

  // Query must contain at least one mathematical operator or function to qualify as a math intent
  const hasOperator = /[+\-*/%^()]|sqrt|cbrt|sin|cos|tan|log|ln|abs|round|floor|ceil/.test(query);
  if (!hasOperator) return null;

  try {
    const tokens = tokenizeMath(query);
    if (!tokens || tokens.length === 0) return null;
    const parser = new MathParser(tokens);
    const value = parser.parse();
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      const formatted = Math.abs(value) > 1e12 || (Math.abs(value) < 1e-6 && value !== 0)
        ? value.toPrecision(6)
        : (Math.round(value * 1000000) / 1000000).toLocaleString();
      return { expression: query, result: formatted, type: 'math' };
    }
  } catch {
    return null;
  }

  return null;
}

// ─── Tokenizer & Recursive-Descent Parser (Zero eval/new Function) ───
type TokenType = 'num' | 'op' | 'fn' | 'lparen' | 'rparen';
interface Token {
  type: TokenType;
  value: string | number;
}

function tokenizeMath(expr: string): Token[] | null {
  const clean = expr.replace(/\s+/g, '');
  const tokens: Token[] = [];
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i]!;

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < clean.length && /[0-9.]/.test(clean[i]!)) {
        numStr += clean[i];
        i++;
      }
      tokens.push({ type: 'num', value: parseFloat(numStr) });
      continue;
    }

    if (/[+\-*/%^]/.test(ch)) {
      // Support double star ** as exponent
      if (ch === '*' && clean[i + 1] === '*') {
        tokens.push({ type: 'op', value: '^' });
        i += 2;
        continue;
      }
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }

    if (/[a-z]/.test(ch)) {
      let word = '';
      while (i < clean.length && /[a-z]/.test(clean[i]!)) {
        word += clean[i];
        i++;
      }

      if (word === 'pi') tokens.push({ type: 'num', value: Math.PI });
      else if (word === 'e') tokens.push({ type: 'num', value: Math.E });
      else if (word === 'tau') tokens.push({ type: 'num', value: Math.PI * 2 });
      else if (['sqrt', 'cbrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln', 'round', 'floor', 'ceil'].includes(word)) {
        tokens.push({ type: 'fn', value: word });
      } else {
        return null; // Unknown word token, not a valid math query
      }
      continue;
    }

    return null;
  }

  return tokens;
}

class MathParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++]!;
  }

  parse(): number {
    const res = this.expr();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected tokens remaining');
    }
    return res;
  }

  private expr(): number {
    let result = this.term();
    while (this.peek() && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.term();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }

  private term(): number {
    let result = this.factor();
    while (this.peek() && (this.peek()!.value === '*' || this.peek()!.value === '/' || this.peek()!.value === '%')) {
      const op = this.consume().value;
      const right = this.factor();
      if (op === '*') result *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        result /= right;
      } else if (op === '%') {
        result %= right;
      }
    }
    return result;
  }

  private factor(): number {
    let result = this.unary();
    while (this.peek() && this.peek()!.value === '^') {
      this.consume();
      const exponent = this.unary();
      result = Math.pow(result, exponent);
    }
    return result;
  }

  private unary(): number {
    if (this.peek() && this.peek()!.value === '-') {
      this.consume();
      return -this.primary();
    }
    if (this.peek() && this.peek()!.value === '+') {
      this.consume();
      return this.primary();
    }
    return this.primary();
  }

  private primary(): number {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of tokens');

    if (token.type === 'num') {
      this.consume();
      return token.value as number;
    }

    if (token.type === 'fn') {
      const fnName = this.consume().value as string;
      if (this.peek()?.type !== 'lparen') throw new Error('Expected ( after function');
      this.consume(); // (
      const arg = this.expr();
      if (this.peek()?.type !== 'rparen') throw new Error('Expected ) after function argument');
      this.consume(); // )

      switch (fnName) {
        case 'sqrt': return Math.sqrt(arg);
        case 'cbrt': return Math.cbrt(arg);
        case 'abs': return Math.abs(arg);
        case 'sin': return Math.sin(arg);
        case 'cos': return Math.cos(arg);
        case 'tan': return Math.tan(arg);
        case 'log': return Math.log10(arg);
        case 'ln': return Math.log(arg);
        case 'round': return Math.round(arg);
        case 'floor': return Math.floor(arg);
        case 'ceil': return Math.ceil(arg);
        default: throw new Error(`Unknown function: ${fnName}`);
      }
    }

    if (token.type === 'lparen') {
      this.consume();
      const val = this.expr();
      if (this.peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
      this.consume();
      return val;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
}

// ─── 3. Omniscient Slash Command Directory ───
export interface SlashCommandInfo {
  command: string;
  engine: string;
  description: string;
  searchUrl: string;
  badge: string;
}

export const SLASH_COMMANDS: Record<string, SlashCommandInfo> = {
  '/g': { command: '/g', engine: 'google', description: 'Search Google', searchUrl: 'https://www.google.com/search?q=%s', badge: 'Google' },
  '/google': { command: '/google', engine: 'google', description: 'Search Google', searchUrl: 'https://www.google.com/search?q=%s', badge: 'Google' },
  '/b': { command: '/b', engine: 'bing', description: 'Search Microsoft Bing', searchUrl: 'https://www.bing.com/search?q=%s', badge: 'Bing' },
  '/bing': { command: '/bing', engine: 'bing', description: 'Search Microsoft Bing', searchUrl: 'https://www.bing.com/search?q=%s', badge: 'Bing' },
  '/d': { command: '/d', engine: 'duckduckgo', description: 'Search DuckDuckGo Privately', searchUrl: 'https://duckduckgo.com/?q=%s', badge: 'DuckDuckGo' },
  '/ddg': { command: '/ddg', engine: 'duckduckgo', description: 'Search DuckDuckGo Privately', searchUrl: 'https://duckduckgo.com/?q=%s', badge: 'DuckDuckGo' },
  '/br': { command: '/br', engine: 'brave', description: 'Search Brave', searchUrl: 'https://search.brave.com/search?q=%s', badge: 'Brave' },
  '/brave': { command: '/brave', engine: 'brave', description: 'Search Brave', searchUrl: 'https://search.brave.com/search?q=%s', badge: 'Brave' },
  '/gh': { command: '/gh', engine: 'github', description: 'Search GitHub Repos & Code', searchUrl: 'https://github.com/search?q=%s', badge: 'GitHub' },
  '/github': { command: '/github', engine: 'github', description: 'Search GitHub Repos & Code', searchUrl: 'https://github.com/search?q=%s', badge: 'GitHub' },
  '/yt': { command: '/yt', engine: 'youtube', description: 'Search YouTube Videos', searchUrl: 'https://www.youtube.com/results?search_query=%s', badge: 'YouTube' },
  '/youtube': { command: '/youtube', engine: 'youtube', description: 'Search YouTube Videos', searchUrl: 'https://www.youtube.com/results?search_query=%s', badge: 'YouTube' },
  '/w': { command: '/w', engine: 'wikipedia', description: 'Search Wikipedia Encyclopedia', searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=%s', badge: 'Wikipedia' },
  '/wiki': { command: '/wiki', engine: 'wikipedia', description: 'Search Wikipedia Encyclopedia', searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=%s', badge: 'Wikipedia' },
  '/r': { command: '/r', engine: 'reddit', description: 'Search Reddit Communities', searchUrl: 'https://www.reddit.com/search/?q=%s', badge: 'Reddit' },
  '/reddit': { command: '/reddit', engine: 'reddit', description: 'Search Reddit Communities', searchUrl: 'https://www.reddit.com/search/?q=%s', badge: 'Reddit' },
  '/so': { command: '/so', engine: 'stackoverflow', description: 'Search Stack Overflow Solutions', searchUrl: 'https://stackoverflow.com/search?q=%s', badge: 'Stack Overflow' },
  '/gpt': { command: '/gpt', engine: 'chatgpt', description: 'Ask OpenAI ChatGPT', searchUrl: 'https://chatgpt.com/?q=%s', badge: 'ChatGPT' },
  '/chatgpt': { command: '/chatgpt', engine: 'chatgpt', description: 'Ask OpenAI ChatGPT', searchUrl: 'https://chatgpt.com/?q=%s', badge: 'ChatGPT' },
  '/claude': { command: '/claude', engine: 'claude', description: 'Ask Anthropic Claude', searchUrl: 'https://claude.ai/?q=%s', badge: 'Claude' },
  '/perp': { command: '/perp', engine: 'perplexity', description: 'Research on Perplexity AI', searchUrl: 'https://www.perplexity.ai/search?q=%s', badge: 'Perplexity' },
  '/gem': { command: '/gem', engine: 'gemini', description: 'Ask Google Gemini', searchUrl: 'https://gemini.google.com/app?q=%s', badge: 'Gemini' },
  '/gemini': { command: '/gemini', engine: 'gemini', description: 'Ask Google Gemini', searchUrl: 'https://gemini.google.com/app?q=%s', badge: 'Gemini' },
  '/tab': { command: '/tab', engine: 'tab', description: 'Search Open Browser Tabs', searchUrl: '', badge: 'Tab Search' },
  '/bm': { command: '/bm', engine: 'bookmark', description: 'Search Bookmarks', searchUrl: '', badge: 'Bookmarks' },
  '/bookmark': { command: '/bookmark', engine: 'bookmark', description: 'Search Bookmarks', searchUrl: '', badge: 'Bookmarks' },
  '/note': { command: '/note', engine: 'notes', description: 'Search Workspace Notes', searchUrl: '', badge: 'Notes' },
  '/notes': { command: '/notes', engine: 'notes', description: 'Search Workspace Notes', searchUrl: '', badge: 'Notes' },
  '/calc': { command: '/calc', engine: 'calc', description: 'Calculate Math or Convert Units', searchUrl: '', badge: 'Calculator' },
  '/ip': { command: '/ip', engine: 'ip', description: 'Check Network & VPN Status', searchUrl: '', badge: 'Network' },
};

// ─── 4. Global Suggestion LRU Cache & In-Flight Abort Manager ───
const suggestionsCache = new BoundedLRUCache<string, string[]>(200);

export async function fetchWebSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<string[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const cached = suggestionsCache.get(trimmed);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const suggestions: string[] = (data[1] || []).slice(0, 6);
    suggestionsCache.set(trimmed, suggestions);
    return suggestions;
  } catch (err: any) {
    if (err?.name === 'AbortError') return [];
    return [];
  }
}

// ─── 5. Browser Tab / Bookmark / History / Local Data Searchers ───
interface ChromeTab {
  id?: number;
  windowId?: number;
  title?: string;
  url?: string;
}

interface ChromeBookmark {
  id: string;
  title?: string;
  url?: string;
}

interface ChromeHistoryItem {
  id: string;
  title?: string;
  url?: string;
}

export async function searchOpenTabs(query: string): Promise<OmniscientResult[]> {
  try {
    const chromeApi = (globalThis as any).chrome;
    if (!chromeApi?.tabs?.query) return [];
    const tabs = await new Promise<ChromeTab[]>((resolve) => {
      chromeApi.tabs.query({}, (result: ChromeTab[]) => {
        if (chromeApi.runtime?.lastError) return resolve([]);
        resolve(result || []);
      });
    });

    const q = query.toLowerCase();
    const matches = tabs
      .filter((t) => {
        const titleMatch = t.title && t.title.toLowerCase().includes(q);
        const urlMatch = t.url && t.url.toLowerCase().includes(q);
        return Boolean(titleMatch || urlMatch);
      })
      .slice(0, 3);

    return matches.map((t) => ({
      id: `tab_${t.id ?? Math.random()}`,
      type: 'tab',
      title: t.title || 'Untitled Tab',
      subtitle: t.url || '',
      value: t.url || '',
      badge: 'Tab',
      tabId: t.id,
      windowId: t.windowId,
      url: t.url,
    }));
  } catch {
    return [];
  }
}

export async function searchBookmarks(query: string): Promise<OmniscientResult[]> {
  try {
    const chromeApi = (globalThis as any).chrome;
    if (!chromeApi?.bookmarks?.search) return [];
    const items = await new Promise<ChromeBookmark[]>((resolve) => {
      chromeApi.bookmarks.search(query, (result: ChromeBookmark[]) => {
        if (chromeApi.runtime?.lastError) return resolve([]);
        resolve(result || []);
      });
    });

    return items
      .filter((b) => Boolean(b.url))
      .slice(0, 3)
      .map((b) => ({
        id: `bm_${b.id}`,
        type: 'bookmark',
        title: b.title || b.url || 'Bookmark',
        subtitle: b.url,
        value: b.url || '',
        badge: 'Bookmark',
        url: b.url,
      }));
  } catch {
    return [];
  }
}

export async function searchHistory(query: string): Promise<OmniscientResult[]> {
  try {
    const chromeApi = (globalThis as any).chrome;
    if (!chromeApi?.history?.search) return [];
    const items = await new Promise<ChromeHistoryItem[]>((resolve) => {
      chromeApi.history.search({ text: query, maxResults: 3 }, (result: ChromeHistoryItem[]) => {
        if (chromeApi.runtime?.lastError) return resolve([]);
        resolve(result || []);
      });
    });

    return items
      .filter((h) => Boolean(h.url))
      .map((h) => ({
        id: `hist_${h.id}`,
        type: 'history',
        title: h.title || h.url || 'History',
        subtitle: h.url,
        value: h.url || '',
        badge: 'History',
        url: h.url,
      }));
  } catch {
    return [];
  }
}

export interface SearchDataSources {
  notes?: Array<{ id: string; title: string; body?: string }>;
  apps?: Array<{ name: string; url: string }>;
}

export function searchLocalNotesAndApps(
  query: string,
  sources: SearchDataSources
): OmniscientResult[] {
  const results: OmniscientResult[] = [];
  const q = query.toLowerCase();

  // Search Notes
  if (sources.notes && sources.notes.length > 0) {
    const matchedNotes = sources.notes
      .filter((n) => (n.title && n.title.toLowerCase().includes(q)) || (n.body && n.body.toLowerCase().includes(q)))
      .slice(0, 2);

    for (const n of matchedNotes) {
      results.push({
        id: `note_${n.id}`,
        type: 'note',
        title: n.title || 'Untitled Note',
        subtitle: n.body ? n.body.substring(0, 60).replace(/\n/g, ' ') : 'Workspace Note',
        value: n.title,
        badge: 'Note',
      });
    }
  }

  // Search Apps / Shortcuts
  if (sources.apps && sources.apps.length > 0) {
    const matchedApps = sources.apps
      .filter((a) => (a.name && a.name.toLowerCase().includes(q)) || (a.url && a.url.toLowerCase().includes(q)))
      .slice(0, 2);

    for (const a of matchedApps) {
      results.push({
        id: `app_${a.name}`,
        type: 'app',
        title: a.name,
        subtitle: a.url,
        value: a.url,
        badge: 'App',
        url: a.url,
      });
    }
  }

  return results;
}

// ─── 6. Master Omniscient Query Coordinator ───
export interface OmniscientSearchOptions {
  query: string;
  signal?: AbortSignal;
  sources?: SearchDataSources;
  currentEngine?: string;
  customSearchUrl?: string;
}

export async function queryOmniscientSearch(
  options: OmniscientSearchOptions
): Promise<OmniscientResult[]> {
  const rawQuery = options.query.trim();
  if (!rawQuery) return [];

  const results: OmniscientResult[] = [];

  // A. Check for Slash Commands First
  if (rawQuery.startsWith('/')) {
    const parts = rawQuery.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() ?? '';
    const remainder = parts.slice(1).join(' ').trim();

    // If typing just a slash or incomplete command, suggest matching commands
    if (!remainder) {
      const matchedCmds = Object.values(SLASH_COMMANDS).filter((sc) =>
        sc.command.startsWith(cmd)
      ).slice(0, 6);

      for (const sc of matchedCmds) {
        results.push({
          id: `slash_${sc.command}`,
          type: 'slash',
          title: `${sc.command} — ${sc.description}`,
          subtitle: `Type '${sc.command} <query>' to route directly to ${sc.badge}`,
          value: `${sc.command} `,
          badge: sc.badge,
        });
      }
      return results;
    }

    // Specific mode filters
    if (cmd === '/tab') {
      return searchOpenTabs(remainder);
    }
    if (cmd === '/bm' || cmd === '/bookmark') {
      return searchBookmarks(remainder);
    }
    if (cmd === '/note' || cmd === '/notes') {
      return searchLocalNotesAndApps(remainder, { notes: options.sources?.notes });
    }
    if (cmd === '/calc') {
      const math = evaluateExpression(remainder);
      if (math) {
        return [{
          id: 'calc_direct',
          type: 'calc',
          title: `= ${math.result}`,
          subtitle: `${math.expression} (${math.type})`,
          value: math.result,
          badge: 'Calc',
          isCalculated: true,
        }];
      }
      return [];
    }
    if (cmd === '/ip') {
      return [{
        id: 'cmd_ip',
        type: 'slash',
        title: 'Network & Proxy Inspector',
        subtitle: 'View current public IP, WebRTC shield, and Tor relay status',
        value: 'https://check.torproject.org',
        badge: 'Network',
        url: 'https://check.torproject.org',
      }];
    }
  }

  // B. Instant Inline Math / Unit / Currency Calculation (Wolfram Grade)
  const mathEval = evaluateExpression(rawQuery);
  if (mathEval) {
    results.push({
      id: `calc_${rawQuery}`,
      type: 'calc',
      title: `= ${mathEval.result}`,
      subtitle: `${mathEval.expression} (${mathEval.type})`,
      value: mathEval.result,
      badge: 'Calc',
      isCalculated: true,
    });
  }

  // C. Query Local Sources concurrently with safe error isolation (Linus Torvalds grade)
  const [tabRes, bmRes, histRes] = await Promise.all([
    searchOpenTabs(rawQuery).catch(() => []),
    searchBookmarks(rawQuery).catch(() => []),
    searchHistory(rawQuery).catch(() => []),
  ]);

  results.push(...tabRes);
  results.push(...bmRes);
  results.push(...histRes);

  if (options.sources) {
    const localRes = searchLocalNotesAndApps(rawQuery, options.sources);
    results.push(...localRes);
  }

  // D. Query Web Suggestions (with AbortSignal & LRU Cache)
  // Strip slash prefix if any
  let suggestQuery = rawQuery;
  if (suggestQuery.startsWith('/')) {
    const parts = suggestQuery.split(/\s+/);
    if (parts.length > 1) {
      suggestQuery = parts.slice(1).join(' ');
    }
  }

  const webSuggestions = await fetchWebSuggestions(suggestQuery, options.signal);
  for (let i = 0; i < webSuggestions.length && results.length < 9; i++) {
    const ws = webSuggestions[i];
    if (ws) {
      results.push({
        id: `web_${i}_${ws}`,
        type: 'web',
        title: ws,
        value: ws,
        badge: 'Search',
      });
    }
  }

  return results.slice(0, 8);
}
