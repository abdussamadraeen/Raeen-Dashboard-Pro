import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStorageMigrations } from '../../lib/storageVersion';

describe('storageVersion module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runStorageMigrations: skips if currentVersion >= targetVersion', async () => {
    (global.chrome.storage.local.get as any).mockResolvedValue({ __raeen_schema_version__: 2 });
    
    const migration = { version: 1, migrate: vi.fn() };
    await runStorageMigrations([migration], 1);
    
    expect(migration.migrate).not.toHaveBeenCalled();
    expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('runStorageMigrations: applies migrations in order', async () => {
    (global.chrome.storage.local.get as any)
      .mockResolvedValueOnce({ __raeen_schema_version__: 0 }) // for version check
      .mockResolvedValueOnce({ data: 'old' }); // for actual data
    
    const m1 = { version: 1, migrate: vi.fn().mockReturnValue({ data: 'v1' }) };
    const m2 = { version: 2, migrate: vi.fn().mockReturnValue({ data: 'v2' }) };
    
    await runStorageMigrations([m2, m1], 2);
    
    expect(m1.migrate).toHaveBeenCalledWith({ data: 'old' });
    expect(m2.migrate).toHaveBeenCalledWith({ data: 'v1' });
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ data: 'v2', __raeen_schema_version__: 2 });
  });

  it('runStorageMigrations: skips failed migration and continues', async () => {
    (global.chrome.storage.local.get as any)
      .mockResolvedValueOnce({ __raeen_schema_version__: 0 })
      .mockResolvedValueOnce({ data: 'old' });
    
    const m1 = { version: 1, migrate: vi.fn().mockImplementation(() => { throw new Error('fail'); }) };
    const m2 = { version: 2, migrate: vi.fn().mockReturnValue({ data: 'v2' }) };
    
    await runStorageMigrations([m1, m2], 2);
    
    expect(m1.migrate).toHaveBeenCalled();
    expect(m2.migrate).toHaveBeenCalledWith({ data: 'old' }); // Should use previous data state since m1 failed
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ data: 'v2', __raeen_schema_version__: 2 });
  });

  it('runStorageMigrations: updates version stamp after all migrations', async () => {
    (global.chrome.storage.local.get as any)
      .mockResolvedValueOnce({ __raeen_schema_version__: 1 })
      .mockResolvedValueOnce({ data: 'old' });
    
    const m2 = { version: 2, migrate: (d: any) => ({ ...d, added: true }) };
    
    await runStorageMigrations([m2], 2);
    
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
      data: 'old',
      added: true,
      __raeen_schema_version__: 2
    });
  });
});
