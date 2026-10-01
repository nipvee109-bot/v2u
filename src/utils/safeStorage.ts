/**
 * Phase 39: Safe Storage Utilities with Quota & Exception Resilience
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isQuotaExceeded?: boolean;
}

/**
 * Safely saves data into localStorage, handling QuotaExceededError or security restrictions gracefully
 */
export function safeSetItem(key: string, value: string): StorageResult<void> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, error: 'Storage not available in this environment' };
  }

  try {
    window.localStorage.setItem(key, value);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    const isQuota =
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('quota'));

    console.warn(`[SafeStorage] Failed to set item "${key}":`, error.message);

    return {
      success: false,
      error: error.message || 'Storage write failed',
      isQuotaExceeded: isQuota,
    };
  }
}

/**
 * Safely retrieves and parses JSON data from localStorage
 */
export function safeGetItem<T = unknown>(key: string, fallback: T | null = null): T | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[SafeStorage] Corrupted or invalid JSON for key "${key}":`, error.message);
    return fallback;
  }
}

/**
 * Safely removes item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
