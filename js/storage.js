export const StorageManager = (() => {
    const DB_NAME = 'AbdusPremiumDB';
    const DB_VERSION = 5;
    let db = null;

    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            // Handle blocking from other tabs
            request.onblocked = () => {
                console.warn("Database upgrade blocked. Please close other tabs.");
                // We still resolve so UI loads, but with a warning
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
                console.error('DB Error: ', e.target.errorCode);
                resolve(); 
            };
        });
    };

    const get = (storeName, key) => {
        return new Promise((resolve) => {
            if (!db) return resolve(null);
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    };

    const set = (storeName, key, value) => {
        return new Promise((resolve, reject) => {
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
            if (!db) return resolve([]);
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    };

    const remove = (storeName, key) => {
        return new Promise((resolve) => {
            if (!db) return resolve();
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
        });
    };

    const isReady = () => db !== null;

    return { init, get, set, getAll, remove, isReady };
})();
