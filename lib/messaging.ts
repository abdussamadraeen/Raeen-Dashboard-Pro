import { Logger } from './logger';
import { safeCallAsync } from './safeCall';

export type BackgroundAction =
  | { action: 'open_dashboard'; openSettings?: boolean }
  | { action: 'open_tab'; url: string }
  | { action: 'vpn_connect'; payload: VpnConnectPayload }
  | { action: 'vpn_disconnect' }
  | { action: 'vpn_get_status' }
  | { action: 'webrtc_shield_set'; enabled: boolean }
  | { action: 'killswitch_set'; enabled: boolean }
  | { action: 'emergency_nuclear_purge' };

export interface VpnConnectPayload {
  scheme?: string;
  host?: string;
  port?: number;
  nodeName?: string;
  isTor?: boolean;
  isShieldOnly?: boolean;
  endpoints?: Array<{ host: string; port: number; scheme: string }>;
  killSwitch?: boolean;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

export async function sendToBackground<T = unknown>(
  message: BackgroundAction,
  timeoutMs = 8_000
): Promise<MessageResponse<T>> {
  const result = await safeCallAsync(async () => {
    return new Promise<MessageResponse<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Message timeout: action=${message.action}`));
      }, timeoutMs);

      try {
        (globalThis as any).chrome?.runtime?.sendMessage(message, (response: MessageResponse<T>) => {
          clearTimeout(timer);
          const lastError = (globalThis as any).chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message ?? 'Unknown runtime error'));
            return;
          }
          resolve(response ?? { success: false, error: 'No response from background' });
        });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }, `sendToBackground:${message.action}`);

  if (result.ok) return result.value;

  Logger.error('sendToBackground failed', result.error);
  return { success: false, error: result.error.message };
}
