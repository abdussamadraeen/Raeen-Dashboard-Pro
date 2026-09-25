/**
 * storage.ts — Resilient Multi-Tier Storage Layer
 *
 * Architecture: 3-tier resilient storage with circuit breakers
 *   Tier 1: IndexedDB (primary — fast, large capacity, structured)
 *   Tier 2: localStorage (fallback — synchronous, small capacity)
 *   Tier 3: In-memory fallbackStore (last resort — no persistence)
 *
 * Resilience guarantees:
 *   - Every public method NEVER throws (resolves gracefully)
 *   - IndexedDB failure automatically demotes to lower tier
 *   - DB version conflicts trigger clean reload
 *   - All transactions wrapped in individual try/catch
 *   - Concurrent init calls are safely de-duplicated
 */

const DB_NAME = 'DashboardDB';
const DB_VERSION = 6;

// ─── State ──────────────────────────────────────────────────────────────────

let db: IDBDatabase | null = null;
let useFallback = false;
let initPromise: Promise<void> | null = null;

/** In-memory fallback (Tier 3): used when both IDB and localStorage fail */
const fallbackStore: Record<string, Record<string, unknown>> = {};

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Safely stringify — returns null on circular reference or quota errors */
function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/** Safely parse — returns null on malformed JSON */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Build localStorage key for a store+key pair */
const lsKey = (storeName: string, key: string) => `app_db_${storeName}_${key}`;
const lsLegacyKey = (storeName: string, key: string) => `raeen_db_${storeName}_${key}`;

// ─── Tier 2: localStorage helpers ───────────────────────────────────────────

function lsGet<T>(storeName: string, key: string): T | null {
  try {
    const val = safeParse<T>(localStorage.getItem(lsKey(storeName, key)));
    if (val !== null) return val;
    return safeParse<T>(localStorage.getItem(lsLegacyKey(storeName, key)));
  } catch {
    return null;
  }
}

function lsSet(storeName: string, key: string, value: unknown): void {
  try {
    const serialized = safeStringify(value);
    if (serialized !== null) {
      localStorage.setItem(lsKey(storeName, key), serialized);
    }
  } catch {
    // localStorage quota exceeded or unavailable — degrade gracefully
  }
}

function lsRemove(storeName: string, key: string): void {
  try {
    localStorage.removeItem(lsKey(storeName, key));
    localStorage.removeItem(lsLegacyKey(storeName, key));
  } catch {
    // ignore
  }
}

function lsGetAll<T>(storeName: string): T[] {
  try {
    const prefix = `app_db_${storeName}_`;
    const legacyPrefix = `raeen_db_${storeName}_`;
    const results: T[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const subKey = k.slice(prefix.length);
        seen.add(subKey);
        const val = safeParse<T>(localStorage.getItem(k));
        if (val !== null) results.push(val);
      }
    }

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(legacyPrefix)) {
        const subKey = k.slice(legacyPrefix.length);
        if (!seen.has(subKey)) {
          seen.add(subKey);
          const val = safeParse<T>(localStorage.getItem(k));
          if (val !== null) results.push(val);
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Tier 3: memory fallback helpers ────────────────────────────────────────

function memGet<T>(storeName: string, key: string): T | null {
  return (fallbackStore[storeName]?.[key] as T) ?? null;
}

function memSet(storeName: string, key: string, value: unknown): void {
  if (!fallbackStore[storeName]) fallbackStore[storeName] = {};
  fallbackStore[storeName][key] = value;
}

function memRemove(storeName: string, key: string): void {
  delete fallbackStore[storeName]?.[key];
}

function memGetAll<T>(storeName: string): T[] {
  return Object.values(fallbackStore[storeName] ?? {}) as T[];
}

// ─── Public StorageManager ───────────────────────────────────────────────────

export const StorageManager = {
  /**
   * Initializes IndexedDB. Idempotent — safe to call multiple times.
   * Concurrent calls share the same promise.
   */
  init(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = new Promise<void>((resolve) => {
      // Guard: IDB requires a window context
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[Storage] IndexedDB unavailable — using localStorage fallback.');
        useFallback = true;
        return resolve();
      }

      let request: IDBOpenDBRequest;

      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        console.error('[Storage] indexedDB.open() threw synchronously — using fallback:', e);
        useFallback = true;
        return resolve();
      }

      // Another tab has a higher-version DB open
      request.onblocked = () => {
        console.warn('[Storage] DB upgrade blocked — another tab may be open. Falling back.');
        useFallback = true;
        resolve();
      };

      // Schema migration — runs only when DB version bumps
      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const upgradeDb = (e.target as IDBOpenDBRequest).result;
        try {
          if (!upgradeDb.objectStoreNames.contains('settings')) {
            upgradeDb.createObjectStore('settings');
          }
          if (!upgradeDb.objectStoreNames.contains('mediaStore')) {
            upgradeDb.createObjectStore('mediaStore');
          }
          if (!upgradeDb.objectStoreNames.contains('imageCache')) {
            upgradeDb.createObjectStore('imageCache');
          }
          // Notes store uses keyPath — must be deleted and re-created on schema change
          if (upgradeDb.objectStoreNames.contains('notes')) {
            upgradeDb.deleteObjectStore('notes');
          }
          const notesStore = upgradeDb.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('updated', 'updated', { unique: false });
        } catch (upgradeErr) {
          console.error('[Storage] onupgradeneeded error:', upgradeErr);
          // We don't set useFallback here; onsuccess or onerror will handle it
        }
      };

      request.onsuccess = (e: Event) => {
        db = (e.target as IDBOpenDBRequest).result;

        // Detect when another tab opens a newer DB version — gracefully reload
        db.onversionchange = () => {
          db?.close();
          db = null;
          console.warn('[Storage] DB version changed by another context — reloading.');
          window.location.reload();
        };

        // Unexpected DB closure (e.g. browser storage pressure)
        db.onclose = () => {
          console.warn('[Storage] DB closed unexpectedly — falling back to localStorage.');
          db = null;
          useFallback = true;
        };

        resolve();
      };

      request.onerror = (e: Event) => {
        const err = (e.target as IDBOpenDBRequest).error;
        console.error('[Storage] IDB open error — using localStorage fallback:', err);
        useFallback = true;
        resolve();
      };
    });

    return initPromise;
  },

  // ─── READ ──────────────────────────────────────────────────────────────────

  get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve) => {
      // Fallback path: localStorage → memory
      if (useFallback || !db) {
        const lsVal = lsGet<T>(storeName, key);
        if (lsVal !== null) return resolve(lsVal);
        return resolve(memGet<T>(storeName, key));
      }

      try {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
        req.onerror = (e) => {
          console.warn(`[Storage] get failed for "${storeName}/${key}":`, (e.target as IDBRequest).error);
          // Cascade to localStorage
          const lsVal = lsGet<T>(storeName, key);
          resolve(lsVal ?? memGet<T>(storeName, key));
        };

        tx.onerror = (e) => {
          console.warn(`[Storage] Transaction error on get "${storeName}":`, (e.target as IDBTransaction).error);
        };
      } catch (e) {
        console.error(`[Storage] get threw for "${storeName}/${key}":`, e);
        const lsVal = lsGet<T>(storeName, key);
        resolve(lsVal ?? memGet<T>(storeName, key));
      }
    });
  },

  // ─── WRITE ─────────────────────────────────────────────────────────────────

  set(storeName: string, key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      // Always write to memory + localStorage as safety net
      const actualKey = (value as any)?.id ?? key;
      memSet(storeName, actualKey, value);
      lsSet(storeName, actualKey, value);

      if (useFallback || !db) {
        return resolve();
      }

      try {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        // keyPath stores use put(value); key-based stores use put(value, key)
        const req = store.keyPath ? store.put(value) : store.put(value, key);

        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          const err = (e.target as IDBRequest).error;
          console.error(`[Storage] set failed for "${storeName}/${key}":`, err);
          // Already written to fallback tiers — resolve anyway to prevent UI breaks
          resolve();
        };

        tx.onerror = (e) => {
          console.warn(`[Storage] Transaction error on set "${storeName}":`, (e.target as IDBTransaction).error);
        };
      } catch (e) {
        console.error(`[Storage] set threw for "${storeName}/${key}":`, e);
        // Already in fallback tiers
        resolve();
      }
    });
  },

  // ─── READ ALL ──────────────────────────────────────────────────────────────

  getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      if (useFallback || !db) {
        const lsResults = lsGetAll<T>(storeName);
        if (lsResults.length > 0) return resolve(lsResults);
        return resolve(memGetAll<T>(storeName));
      }

      try {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = (e) => {
          console.warn(`[Storage] getAll failed for "${storeName}":`, (e.target as IDBRequest).error);
          const lsResults = lsGetAll<T>(storeName);
          resolve(lsResults.length > 0 ? lsResults : memGetAll<T>(storeName));
        };
      } catch (e) {
        console.error(`[Storage] getAll threw for "${storeName}":`, e);
        const lsResults = lsGetAll<T>(storeName);
        resolve(lsResults.length > 0 ? lsResults : memGetAll<T>(storeName));
      }
    });
  },

  // ─── DELETE ────────────────────────────────────────────────────────────────

  remove(storeName: string, key: string): Promise<void> {
    return new Promise((resolve) => {
      // Remove from all tiers immediately
      memRemove(storeName, key);
      lsRemove(storeName, key);

      if (useFallback || !db) {
        return resolve();
      }

      try {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          console.warn(`[Storage] remove failed for "${storeName}/${key}":`, (e.target as IDBRequest).error);
          resolve(); // Already removed from fallback tiers
        };
      } catch (e) {
        console.error(`[Storage] remove threw for "${storeName}/${key}":`, e);
        resolve();
      }
    });
  },

  // ─── CLEAR STORE ───────────────────────────────────────────────────────────

  clearStore(storeName: string): Promise<void> {
    return new Promise((resolve) => {
      // Clear memory tier
      delete fallbackStore[storeName];

      // Clear localStorage tier
      try {
        const prefix = `app_db_${storeName}_`;
        const legacyPrefix = `raeen_db_${storeName}_`;
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(prefix) || k.startsWith(legacyPrefix))) keysToDelete.push(k);
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
      } catch {
        // ignore
      }

      if (useFallback || !db) {
        return resolve();
      }

      try {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          console.warn(`[Storage] clearStore failed for "${storeName}":`, (e.target as IDBRequest).error);
          resolve();
        };
      } catch (e) {
        console.error(`[Storage] clearStore threw for "${storeName}":`, e);
        resolve();
      }
    });
  },

  // ─── STATUS ────────────────────────────────────────────────────────────────

  /** Returns true once the storage system is ready to use */
  isReady(): boolean {
    return db !== null || useFallback;
  },

  /** Returns the active storage tier for diagnostics */
  getTier(): 'indexeddb' | 'localstorage' | 'memory' {
    if (db !== null) return 'indexeddb';
    if (useFallback) {
      try {
        localStorage.setItem('__app_tier_test__', '1');
        localStorage.removeItem('__app_tier_test__');
        return 'localstorage';
      } catch {
        return 'memory';
      }
    }
    return 'memory';
  },

  /** Force-resets internal state — useful for testing or after storage errors */
  _reset(): void {
    db?.close();
    db = null;
    useFallback = false;
    initPromise = null;
  },
};
