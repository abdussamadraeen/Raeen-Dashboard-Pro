export const StorageManager = (() => {
    const DB_NAME = 'AbdusPremiumDB';
    const DB_VERSION = 4;
    let db = null;

    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            // Set a timeout to prevent hanging if DB open takes too long
            const timeout = setTimeout(() => {
                console.error("Storage initialization timed out");
                resolve(); // Proceed anyway so UI doesn't freeze
            }, 3000);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
                if (!db.objectStoreNames.contains('mediaStore')) db.createObjectStore('mediaStore');
                if (!db.objectStoreNames.contains('imageCache')) db.createObjectStore('imageCache');
                if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
            };
            request.onsuccess = (e) => { 
                clearTimeout(timeout);
                db = e.target.result; 
                resolve(); 
            };
            request.onerror = (e) => {
                clearTimeout(timeout);
                console.error('DB Error: ', e.target.errorCode);
                resolve(); // Still resolve so UI can load
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

    return { init, get, set, getAll, remove };
})();
