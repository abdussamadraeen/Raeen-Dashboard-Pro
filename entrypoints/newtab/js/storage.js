export const StorageManager = (() => {
    const DB_NAME = 'RaeenPremiumDB';
    const DB_VERSION = 5;
    let db = null;
    let isFallbackMode = false;
    const memoryCache = {}; // Cache in memory if both DB and localstorage fail

    const init = () => {
        return new Promise((resolve) => {
            try {
                if (typeof window === 'undefined' || !window.indexedDB) {
                    console.warn("IndexedDB not supported, using localStorage fallback.");
                    isFallbackMode = true;
                    return resolve();
                }

                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                // Handle blocking from other tabs
                request.onblocked = () => {
                    console.warn("Database upgrade blocked. Please close other tabs.");
                    resolve(); 
                };

                request.onupgradeneeded = (e) => {
                    const upgradeDb = e.target.result;
                    if (!upgradeDb.objectStoreNames.contains('settings')) upgradeDb.createObjectStore('settings');
                    if (!upgradeDb.objectStoreNames.contains('mediaStore')) upgradeDb.createObjectStore('mediaStore');
                    if (!upgradeDb.objectStoreNames.contains('imageCache')) upgradeDb.createObjectStore('imageCache');
                    
                    if (upgradeDb.objectStoreNames.contains('notes')) {
                        upgradeDb.deleteObjectStore('notes');
                    }
                    upgradeDb.createObjectStore('notes', { keyPath: 'id' });
                };

                request.onsuccess = (e) => { 
                    db = e.target.result; 
                    
                    // Handle version changes in other tabs
                    db.onversionchange = () => {
                        db.close();
                        console.log("Database version changed elsewhere. Reloading...");
                        window.location.reload();
                    };
                    
                    resolve(); 
                };

                request.onerror = (e) => {
                    console.error('DB Error, using fallback: ', e.target.error || e.target.errorCode);
                    isFallbackMode = true;
                    resolve(); 
                };
            } catch (err) {
                console.error("IndexedDB open threw error, using fallback: ", err);
                isFallbackMode = true;
                resolve();
            }
        });
    };

    const get = (storeName, key) => {
        return new Promise((resolve) => {
            if (isFallbackMode) {
                try {
                    const fallbackKey = `raeen_db_${storeName}_${key}`;
                    const cached = localStorage.getItem(fallbackKey);
                    if (cached) {
                        return resolve(JSON.parse(cached));
                    }
                } catch (err) {
                    console.error("Fallback read failed:", err);
                }
                return resolve(memoryCache[storeName]?.[key] || null);
            }

            if (!db) return resolve(null);

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            } catch (e) {
                console.error(`Read transaction failed for ${storeName}:`, e);
                resolve(null);
            }
        });
    };

    const set = (storeName, key, value) => {
        return new Promise((resolve, reject) => {
            if (isFallbackMode) {
                try {
                    if (!memoryCache[storeName]) {
                        memoryCache[storeName] = {};
                    }
                    const itemKey = value?.id || key;
                    memoryCache[storeName][itemKey] = value;
                    
                    const fallbackKey = `raeen_db_${storeName}_${itemKey}`;
                    localStorage.setItem(fallbackKey, JSON.stringify(value));
                    return resolve();
                } catch (err) {
                    console.error("Fallback write failed:", err);
                    return reject(err);
                }
            }

            if (!db) return reject('DB not initialized');

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // If the store has a keyPath, we should NOT provide a separate key argument
                const request = store.keyPath ? store.put(value) : store.put(value, key);
                
                request.onsuccess = () => resolve();
                request.onerror = (e) => {
                    console.error(`Error saving to ${storeName}:`, e.target.error);
                    reject(e.target.error);
                };
            } catch (e) {
                console.error(`Transaction failed for ${storeName}:`, e);
                reject(e);
            }
        });
    };

    const getAll = (storeName) => {
        return new Promise((resolve) => {
            if (isFallbackMode) {
                try {
                    const results = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const lKey = localStorage.key(i);
                        if (lKey && lKey.startsWith(`raeen_db_${storeName}_`)) {
                            const cached = localStorage.getItem(lKey);
                            if (cached) {
                                results.push(JSON.parse(cached));
                            }
                        }
                    }
                    if (results.length > 0) {
                        return resolve(results);
                    }
                } catch (err) {
                    console.error("Fallback getAll failed:", err);
                }
                const cachedStore = memoryCache[storeName];
                return resolve(cachedStore ? Object.values(cachedStore) : []);
            }

            if (!db) return resolve([]);

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            } catch (e) {
                console.error(`GetAll failed for ${storeName}:`, e);
                resolve([]);
            }
        });
    };

    const remove = (storeName, key) => {
        return new Promise((resolve) => {
            if (isFallbackMode) {
                try {
                    if (memoryCache[storeName]) {
                        delete memoryCache[storeName][key];
                    }
                    const fallbackKey = `raeen_db_${storeName}_${key}`;
                    localStorage.removeItem(fallbackKey);
                } catch (err) {
                    console.error("Fallback remove failed:", err);
                }
                return resolve();
            }

            if (!db) return resolve();

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            } catch (e) {
                console.error(`Remove failed for ${storeName}:`, e);
                resolve();
            }
        });
    };

    const isReady = () => db !== null || isFallbackMode;

    return { init, get, set, getAll, remove, isReady };
})();
