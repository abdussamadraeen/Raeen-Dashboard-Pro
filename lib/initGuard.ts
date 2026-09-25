import { Logger } from './logger';

const initialized = new Set<string>();

export function guardInit(name: string): boolean {
  if (initialized.has(name)) {
    Logger.debug(`guardInit: '${name}' already initialized, skipping`);
    return false;
  }
  initialized.add(name);
  return true;
}

export function resetInit(name: string): void {
  initialized.delete(name);
}

export function isInitialized(name: string): boolean {
  return initialized.has(name);
}
