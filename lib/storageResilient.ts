import { Logger } from './logger';
import { CircuitBreaker } from './retry';
import { safeCallAsync } from './safeCall';

const breakers = new Map<string, CircuitBreaker>();
const getBreaker = (store: string) => {
  if (!breakers.has(store)) {
    breakers.set(
      store,
      new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 15_000, name: `idb:${store}` })
    );
  }
  return breakers.get(store)!;
};

const memoryCache = new Map<string, unknown>();
const cacheKey = (store: string, key: string) => `${store}::${key}`;

async function chromeStorageGet<T>(store: string, key: string): Promise<T | null> {
  const result = await safeCallAsync(async () => {
    const chrome = (globalThis as any).chrome;
    if (!chrome?.storage?.local) return null;
    const k = `${store}::${key}`;
    const data = await chrome.storage.local.get(k);
    return (data[k] as T) ?? null;
  }, 'chromeStorageGet');
  return result.ok ? result.value : null;
}

async function chromeStorageSet(store: string, key: string, value: unknown): Promise<void> {
  await safeCallAsync(async () => {
    const chrome = (globalThis as any).chrome;
    if (!chrome?.storage?.local) return;
    const k = `${store}::${key}`;
    await chrome.storage.local.set({ [k]: value });
  }, 'chromeStorageSet');
}

export async function resilientGet<T>(
  idbGet: (store: string, key: string) => Promise<T | null>,
  store: string,
  key: string
): Promise<T | null> {
  const breaker = getBreaker(store);
  const ck = cacheKey(store, key);

  const idbResult = await safeCallAsync(
    () => breaker.call(() => idbGet(store, key), async () => null),
    `resilientGet:idb:${store}:${key}`
  );

  if (idbResult.ok && idbResult.value !== null) {
    memoryCache.set(ck, idbResult.value);
    return idbResult.value;
  }

  const chromeResult = await chromeStorageGet<T>(store, key);
  if (chromeResult !== null) {
    Logger.warn(`resilientGet: IDB miss, using chrome.storage for ${store}:${key}`);
    memoryCache.set(ck, chromeResult);
    return chromeResult;
  }

  const mem = memoryCache.get(ck);
  if (mem !== undefined) {
    Logger.warn(`resilientGet: chrome.storage miss, using memory for ${store}:${key}`);
    return mem as T;
  }

  return null;
}

export async function resilientSet(
  idbSet: (store: string, key: string, value: unknown) => Promise<void>,
  store: string,
  key: string,
  value: unknown
): Promise<void> {
  const ck = cacheKey(store, key);
  memoryCache.set(ck, value);

  await Promise.allSettled([
    safeCallAsync(() => idbSet(store, key, value), `resilientSet:idb:${store}:${key}`),
    chromeStorageSet(store, key, value),
  ]);
}

export function invalidateMemoryCache(store: string, key: string): void {
  memoryCache.delete(cacheKey(store, key));
}
