const DB_NAME = 'RaeenPremiumDB';
const DB_VERSION = 5;

let db: IDBDatabase | null = null;
let useFallback = false;
const fallbackStore: Record<string, Record<string, any>> = {};

export const StorageManager = {
  init(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || !window.indexedDB) {
          console.warn('IndexedDB not supported or window is undefined, using localStorage fallback.');
          useFallback = true;
          return resolve();
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          console.warn('Database upgrade blocked. Please close other tabs.');
          resolve();
        };

        request.onupgradeneeded = (e: any) => {
          const upgradeDb = e.target.result as IDBDatabase;
          if (!upgradeDb.objectStoreNames.contains('settings')) {
            upgradeDb.createObjectStore('settings');
          }
          if (!upgradeDb.objectStoreNames.contains('mediaStore')) {
            upgradeDb.createObjectStore('mediaStore');
          }
          if (!upgradeDb.objectStoreNames.contains('imageCache')) {
            upgradeDb.createObjectStore('imageCache');
          }
          if (upgradeDb.objectStoreNames.contains('notes')) {
            upgradeDb.deleteObjectStore('notes');
          }
          upgradeDb.createObjectStore('notes', { keyPath: 'id' });
        };

        request.onsuccess = (e: any) => {
          db = e.target.result as IDBDatabase;

          db.onversionchange = () => {
            db?.close();
            console.log('Database version changed elsewhere. Reloading...');
            window.location.reload();
          };

          resolve();
        };

        request.onerror = (e: any) => {
          console.error('DB Error, using fallback: ', e.target.error || e.target.errorCode);
          useFallback = true;
          resolve();
        };
      } catch (e) {
        console.error('IndexedDB open threw error, using fallback: ', e);
        useFallback = true;
        resolve();
      }
    });
  },

  get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (useFallback) {
        try {
          const localKey = `raeen_db_${storeName}_${key}`;
          const val = localStorage.getItem(localKey);
          if (val) {
            return resolve(JSON.parse(val) as T);
          }
        } catch (e) {
          console.error('Fallback read failed:', e);
        }
        return resolve((fallbackStore[storeName]?.[key] as T) || null);
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
  },

  set(storeName: string, key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (useFallback) {
        try {
          if (!fallbackStore[storeName]) {
            fallbackStore[storeName] = {};
          }
          // For notes store, we might store objects with an ID keyPath
          const actualKey = value?.id || key;
          fallbackStore[storeName][actualKey] = value;

          const localKey = `raeen_db_${storeName}_${actualKey}`;
          localStorage.setItem(localKey, JSON.stringify(value));
          resolve();
        } catch (e) {
          console.error('Fallback write failed:', e);
          reject(e);
        }
        return;
      }

      if (!db) return reject('DB not initialized');
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const request = store.keyPath ? store.put(value) : store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = (e: any) => {
          console.error(`Error saving to ${storeName}:`, e.target.error);
          reject(e.target.error);
        };
      } catch (e) {
        console.error(`Transaction failed for ${storeName}:`, e);
        reject(e);
      }
    });
  },

  getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      if (useFallback) {
        try {
          const results: T[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const localKey = localStorage.key(i);
            if (localKey && localKey.startsWith(`raeen_db_${storeName}_`)) {
              const val = localStorage.getItem(localKey);
              if (val) {
                results.push(JSON.parse(val) as T);
              }
            }
          }
          if (results.length > 0) return resolve(results);
        } catch (e) {
          console.error('Fallback getAll failed:', e);
        }

        const memStore = fallbackStore[storeName];
        if (memStore) {
          return resolve(Object.values(memStore) as T[]);
        }
        return resolve([]);
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
  },

  remove(storeName: string, key: string): Promise<void> {
    return new Promise((resolve) => {
      if (useFallback) {
        try {
          if (fallbackStore[storeName]) {
            delete fallbackStore[storeName][key];
          }
          const localKey = `raeen_db_${storeName}_${key}`;
          localStorage.removeItem(localKey);
        } catch (e) {
          console.error('Fallback remove failed:', e);
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
  },

  isReady(): boolean {
    return db !== null || useFallback;
  },
};
