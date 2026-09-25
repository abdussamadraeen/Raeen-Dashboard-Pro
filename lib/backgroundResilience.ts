import { Logger } from './logger';
import { safeCallAsync } from './safeCall';
import { withRetry } from './retry';

export function createMessageHandler(
  handler: (request: any, sender: any) => Promise<Record<string, unknown>>
): (request: any, sender: any, sendResponse: (r: any) => void) => true {
  return (request, sender, sendResponse) => {
    (async () => {
      try {
        const result = await handler(request, sender);
        sendResponse(result);
      } catch (err) {
        Logger.error(`Message handler crashed [action=${request?.action}]`, err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return true as const;
  };
}

export async function safeStorageGet(
  keys: string | string[] | Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = await safeCallAsync(
    () => withRetry(() => browser.storage.local.get(keys as any), { maxAttempts: 3, initialDelayMs: 100 }),
    'safeStorageGet'
  );
  return result.ok ? (result.value as Record<string, unknown>) : {};
}

export async function safeStorageSet(data: Record<string, unknown>): Promise<void> {
  await safeCallAsync(
    () => withRetry(() => browser.storage.local.set(data), { maxAttempts: 3, initialDelayMs: 100 }),
    'safeStorageSet'
  );
}

export async function waitForApiReady(
  checkFn: () => boolean,
  maxWaitMs = 5000
): Promise<boolean> {
  const start = Date.now();
  let delay = 50;
  while (Date.now() - start < maxWaitMs) {
    if (checkFn()) return true;
    await new Promise<void>(res => setTimeout(res, delay));
    delay = Math.min(delay * 1.5, 500);
  }
  Logger.warn('waitForApiReady: timed out after ' + maxWaitMs + 'ms');
  return false;
}

export function startSwKeepAlive(intervalMs = 20_000): () => void {
  const id = setInterval(() => {
    safeCallAsync(
      () => browser.storage.local.get('__keepalive_ping__'),
      'swKeepAlive'
    );
  }, intervalMs);
  return () => clearInterval(id);
}
