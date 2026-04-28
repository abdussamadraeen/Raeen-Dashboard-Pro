export const StorageManager = (() => {
    const DB_NAME = 'AbdusPremiumDB';
    const DB_VERSION = 4;
    let db = null;

    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
                if (!db.objectStoreNames.contains('mediaStore')) db.createObjectStore('mediaStore');
                if (!db.objectStoreNames.contains('imageCache')) db.createObjectStore('imageCache');
                if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
            };
            request.onsuccess = (e) => { db = e.target.result; resolve(); };
            request.onerror = (e) => reject('DB Error: ' + e.target.errorCode);
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
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = key ? store.put(value, key) : store.put(value);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Set Error');
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
