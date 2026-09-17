/**
 * StorageManager - High-Performance Dual-Layer Storage Engine
 * L1: In-memory write-through cache (0.00ms instantaneous reads)
 * L2: IndexedDB with automatic schema migrations + localStorage fallback
 * Resilient against blocking, upgrade locks, and cold-start latency.
 */

export const StorageManager = (() => {
    const DB_NAME = 'RaeenPremiumDB';
    const DB_VERSION = 5;
    let db = null;
    let isFallbackMode = false;
    let initPromise = null;
    const memoryCache = Object.create(null);

    const getL1 = (storeName, key) => {
        return memoryCache[storeName] ? memoryCache[storeName][key] : undefined;
    };

    const setL1 = (storeName, key, value) => {
        if (!memoryCache[storeName]) {
            memoryCache[storeName] = Object.create(null);
        }
        memoryCache[storeName][key] = value;
    };

    const removeL1 = (storeName, key) => {
        if (memoryCache[storeName]) {
            delete memoryCache[storeName][key];
        }
    };

    const init = () => {
        if (initPromise) return initPromise;
        initPromise = new Promise((resolve) => {
            let settled = false;
            const safeResolve = () => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            // Hard safety timeout: if IndexedDB blocks or hangs for > 800ms, switch to fast fallback
            const timeoutId = setTimeout(() => {
                if (!db) {
                    console.warn('[Storage] IndexedDB open timeout, activating instant fallback.');
                    isFallbackMode = true;
                    safeResolve();
                }
            }, 800);

            try {
                if (typeof window === 'undefined' || !window.indexedDB) {
                    isFallbackMode = true;
                    clearTimeout(timeoutId);
                    return safeResolve();
                }

                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onblocked = () => {
                    console.warn('[Storage] DB upgrade blocked by other tab.');
                    clearTimeout(timeoutId);
                    safeResolve();
                };

                request.onupgradeneeded = (e) => {
                    const upgradeDb = e.target.result;
                    if (!upgradeDb.objectStoreNames.contains('settings')) upgradeDb.createObjectStore('settings');
                    if (!upgradeDb.objectStoreNames.contains('mediaStore')) upgradeDb.createObjectStore('mediaStore');
                    if (!upgradeDb.objectStoreNames.contains('imageCache')) upgradeDb.createObjectStore('imageCache');
                    if (!upgradeDb.objectStoreNames.contains('notes')) {
                        upgradeDb.createObjectStore('notes', { keyPath: 'id' });
                    }
                };

                request.onsuccess = (e) => {
                    clearTimeout(timeoutId);
                    db = e.target.result;

                    db.onversionchange = () => {
                        try { db.close(); } catch (err) {}
                        db = null;
                        isFallbackMode = true;
                    };

                    safeResolve();
                };

                request.onerror = (e) => {
                    clearTimeout(timeoutId);
                    console.warn('[Storage] DB error, using fallback:', e.target.error || e.target.errorCode);
                    isFallbackMode = true;
                    safeResolve();
                };
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn('[Storage] IndexedDB thrown error, using fallback:', err);
                isFallbackMode = true;
                safeResolve();
            }
        });
        return initPromise;
    };

    const ensureInit = async () => {
        if (!db && !isFallbackMode) {
            await init();
        }
    };

    const get = async (storeName, key) => {
        // 1. Fast L1 Memory Cache Check (0.00ms)
        const cached = getL1(storeName, key);
        if (cached !== undefined) {
            return cached;
        }

        await ensureInit();

        // 2. LocalStorage Fallback Check
        if (isFallbackMode || !db) {
            try {
                const fallbackKey = `raeen_db_${storeName}_${key}`;
                const raw = localStorage.getItem(fallbackKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    setL1(storeName, key, parsed);
                    return parsed;
                }
            } catch (err) {
                console.warn('[Storage] Fallback read failed:', err);
            }
            return null;
        }

        // 3. IndexedDB Read
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);

                req.onsuccess = () => {
                    const res = req.result !== undefined ? req.result : null;
                    if (res !== null) setL1(storeName, key, res);
                    resolve(res);
                };

                req.onerror = () => resolve(null);
            } catch (e) {
                console.warn(`[Storage] Read failed for ${storeName}:`, e);
                resolve(null);
            }
        });
    };

    const set = async (storeName, key, value) => {
        const itemKey = value?.id || key;
        // Immediate write to L1 cache for instant synchronous consistency
        setL1(storeName, itemKey, value);

        await ensureInit();

        if (isFallbackMode || !db) {
            try {
                const fallbackKey = `raeen_db_${storeName}_${itemKey}`;
                localStorage.setItem(fallbackKey, JSON.stringify(value));
            } catch (err) {
                console.warn('[Storage] Fallback write failed:', err);
            }
            return;
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.keyPath ? store.put(value) : store.put(value, key);

                req.onsuccess = () => resolve();
                req.onerror = (e) => {
                    console.warn(`[Storage] Put failed for ${storeName}, mirroring to localStorage:`, e.target.error);
                    try {
                        localStorage.setItem(`raeen_db_${storeName}_${itemKey}`, JSON.stringify(value));
                    } catch (err) {}
                    resolve();
                };
            } catch (e) {
                console.warn(`[Storage] Transaction failed for ${storeName}:`, e);
                try {
                    localStorage.setItem(`raeen_db_${storeName}_${itemKey}`, JSON.stringify(value));
                } catch (err) {}
                resolve();
            }
        });
    };

    const getAll = async (storeName) => {
        await ensureInit();

        if (isFallbackMode || !db) {
            try {
                const results = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const lKey = localStorage.key(i);
                    if (lKey && lKey.startsWith(`raeen_db_${storeName}_`)) {
                        const raw = localStorage.getItem(lKey);
                        if (raw) results.push(JSON.parse(raw));
                    }
                }
                if (results.length > 0) return results;
            } catch (err) {
                console.warn('[Storage] Fallback getAll failed:', err);
            }
            return memoryCache[storeName] ? Object.values(memoryCache[storeName]) : [];
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    // Populate L1 cache
                    list.forEach(item => {
                        const k = item?.id || (store.keyPath ? item[store.keyPath] : null);
                        if (k) setL1(storeName, k, item);
                    });
                    resolve(list);
                };
                req.onerror = () => resolve([]);
            } catch (e) {
                console.warn(`[Storage] GetAll failed for ${storeName}:`, e);
                resolve([]);
            }
        });
    };

    const remove = async (storeName, key) => {
        removeL1(storeName, key);

        await ensureInit();

        if (isFallbackMode || !db) {
            try {
                localStorage.removeItem(`raeen_db_${storeName}_${key}`);
            } catch (err) {
                console.warn('[Storage] Fallback remove failed:', err);
            }
            return;
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([storeName], 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
            } catch (e) {
                console.warn(`[Storage] Remove failed for ${storeName}:`, e);
                resolve();
            }
        });
    };

    const isReady = () => db !== null || isFallbackMode;

    return { init, get, set, getAll, remove, isReady };
})();
