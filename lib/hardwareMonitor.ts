import { Logger } from './logger';

export interface HardwareCapabilities {
  cpuCores: number;
  deviceMemoryGb: number;
  prefersReducedMotion: boolean;
  isSlowConnection: boolean;
  recommendedConcurrency: number;
  throttleAnimations: boolean;
}

let cachedCapabilities: HardwareCapabilities | null = null;

export function getHardwareCapabilities(): HardwareCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  try {
    const cpuCores = (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null) ?? 2;
    const deviceMemoryGb = (typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : null) ?? 2;
    const prefersReducedMotion =
      (typeof window !== 'undefined' && window.matchMedia)
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    const connection =
      typeof navigator !== 'undefined'
        ? (navigator as any).connection ||
          (navigator as any).mozConnection ||
          (navigator as any).webkitConnection
        : null;
    const effectiveType: string = connection?.effectiveType ?? '4g';
    const saveData: boolean = connection?.saveData ?? false;
    const isSlowConnection =
      saveData ||
      effectiveType === 'slow-2g' ||
      effectiveType === '2g' ||
      effectiveType === '3g';

    const recommendedConcurrency = Math.max(1, Math.min(8, Math.floor(cpuCores / 2)));
    const throttleAnimations = prefersReducedMotion || deviceMemoryGb <= 2 || isSlowConnection;

    cachedCapabilities = {
      cpuCores,
      deviceMemoryGb,
      prefersReducedMotion,
      isSlowConnection,
      recommendedConcurrency,
      throttleAnimations,
    };

    Logger.info('Hardware capabilities detected', cachedCapabilities);
    return cachedCapabilities;
  } catch (err) {
    Logger.warn('Hardware detection failed, using safe defaults', err);
    cachedCapabilities = {
      cpuCores: 2,
      deviceMemoryGb: 2,
      prefersReducedMotion: false,
      isSlowConnection: false,
      recommendedConcurrency: 1,
      throttleAnimations: false,
    };
    return cachedCapabilities;
  }
}

export function invalidateHardwareCache(): void {
  cachedCapabilities = null;
}

export async function runWithHardwareConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  maxConcurrency?: number
): Promise<Array<T | Error>> {
  const cap = getHardwareCapabilities();
  const limit = maxConcurrency ?? cap.recommendedConcurrency;
  const results: Array<T | Error> = new Array(tasks.length);

  let index = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) {
      const i = index++;
      try {
        const task = tasks[i]; if (task) results[i] = await task();
      } catch (err) {
        results[i] = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Task ${i} failed in runWithHardwareConcurrency`, err);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
