import { Logger } from './logger';
import { safeCallAsync } from './safeCall';

export type MigrationFn = (oldData: Record<string, unknown>) => Record<string, unknown>;

export interface StorageMigration {
  version: number;
  migrate: MigrationFn;
  description?: string;
}

const SCHEMA_VERSION_KEY = '__raeen_schema_version__';

export async function runStorageMigrations(
  migrations: StorageMigration[],
  targetVersion: number
): Promise<void> {
  const result = await safeCallAsync(async () => {
    const chrome = (globalThis as any).chrome;
    if (!chrome?.storage?.local) return;

    const stored = await chrome.storage.local.get(SCHEMA_VERSION_KEY);
    const currentVersion: number = stored[SCHEMA_VERSION_KEY] ?? 0;

    if (currentVersion >= targetVersion) {
      Logger.debug(`Storage schema is up to date (v${currentVersion})`);
      return;
    }

    Logger.info(`Running storage migrations v${currentVersion} to v${targetVersion}`);

    const allData: Record<string, unknown> = await chrome.storage.local.get(null);
    let data = { ...allData };

    const pending = migrations
      .filter(m => m.version > currentVersion && m.version <= targetVersion)
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      try {
        Logger.info(`Applying migration v${migration.version}: ${migration.description ?? ''}`);
        data = migration.migrate(data);
      } catch (err) {
        Logger.error(`Migration v${migration.version} failed - skipping`, err);
      }
    }

    data[SCHEMA_VERSION_KEY] = targetVersion;
    await chrome.storage.local.set(data);
    Logger.info(`Storage migrations complete to v${targetVersion}`);
  }, 'runStorageMigrations');

  if (!result.ok) {
    Logger.error('Storage migration system failed', result.error);
  }
}
