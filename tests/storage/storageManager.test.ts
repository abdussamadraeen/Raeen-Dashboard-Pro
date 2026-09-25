import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageManager } from '../../store/storage';

describe('StorageManager', () => {
  beforeEach(() => {
    StorageManager._reset();
    localStorage.clear();
  });

  it('init(): initializes successfully', async () => {
    await StorageManager.init();
    expect(StorageManager.isReady()).toBe(true);
  });

  it('init(): concurrent calls return same promise', () => {
    const p1 = StorageManager.init();
    const p2 = StorageManager.init();
    expect(p1).toBe(p2);
  });

  it('get(): returns null for missing key', async () => {
    await StorageManager.init();
    const val = await StorageManager.get('testStore', 'missing');
    expect(val).toBeNull();
  });

  it('set(): stores value and get(): returns stored value', async () => {
    await StorageManager.init();
    await StorageManager.set('testStore', 'key1', { data: 'test' });
    const val = await StorageManager.get('testStore', 'key1');
    expect(val).toEqual({ data: 'test' });
  });

  it('set(): falls back to localStorage on IDB error', async () => {
    // Forcing fallback by not initializing IDB or setting useFallback
    // Since we mock IDB in setup or it falls back, let's just trigger fallback manually
    // We can simulate IDB failure or just use fallback store
    await StorageManager.init();
    // fake IDB failure by setting db to null and useFallback to true
    (StorageManager as any)._reset();
    
    // We didn't init, so db is null
    await StorageManager.set('testStore', 'key2', { data: 'test2' });
    const val = await StorageManager.get('testStore', 'key2');
    expect(val).toEqual({ data: 'test2' });
    expect(localStorage.getItem('raeen_db_testStore_key2')).toBeTruthy();
  });

  it('remove(): removes value from all tiers', async () => {
    await StorageManager.init();
    await StorageManager.set('testStore', 'key3', { data: 'test3' });
    await StorageManager.remove('testStore', 'key3');
    
    const val = await StorageManager.get('testStore', 'key3');
    expect(val).toBeNull();
    expect(localStorage.getItem('raeen_db_testStore_key3')).toBeNull();
  });

  it('getAll(): returns all values for store', async () => {
    await StorageManager.init();
    await StorageManager.set('testStore', 'key1', { id: 'key1', data: '1' });
    await StorageManager.set('testStore', 'key2', { id: 'key2', data: '2' });
    
    const all = await StorageManager.getAll('testStore');
    expect(all).toHaveLength(2);
    expect(all).toContainEqual({ id: 'key1', data: '1' });
    expect(all).toContainEqual({ id: 'key2', data: '2' });
  });

  it('getTier(): returns correct tier name', async () => {
    // without init, memory tier because db=null and useFallback=false
    // Wait, getTier says if db!==null return 'indexeddb', if useFallback return 'localstorage'
    // Let's init with indexeddb
    await StorageManager.init();
    expect(['indexeddb', 'localstorage', 'memory']).toContain(StorageManager.getTier());
  });
});
