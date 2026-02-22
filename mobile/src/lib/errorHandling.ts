import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEBUG_LOGS_KEY = 'pantryiq_debug_logs';
export const MAX_LOG_ENTRIES = 100;

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export async function logDebug(
  message: string,
  level: 'info' | 'warn' | 'error' | 'debug' = 'debug',
  context?: Record<string, any>
): Promise<void> {
  const log: DebugLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  console.log(`[${level.toUpperCase()}] ${message}`, context || '');

  try {
    const existing = await AsyncStorage.getItem(DEBUG_LOGS_KEY);
    const logs = existing ? JSON.parse(existing) : [];

    logs.push(log);

    // Keep only the most recent MAX_LOG_ENTRIES
    const trimmed = logs.slice(-MAX_LOG_ENTRIES);

    await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to log debug message:', e);
  }
}

export async function getDebugLogs(): Promise<DebugLog[]> {
  try {
    const existing = await AsyncStorage.getItem(DEBUG_LOGS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    console.warn('Failed to get debug logs:', e);
    return [];
  }
}

export async function clearDebugLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEBUG_LOGS_KEY);
  } catch (e) {
    console.warn('Failed to clear debug logs:', e);
  }
}

/**
 * Safely call an API with retry logic and error handling
 */
export async function callAPI<T>(
  url: string,
  options: RequestInit = {},
  retryCount: number = 3,
  retryDelayMs: number = 1000
): Promise<{ ok: boolean; data?: T; error?: string }> {
  let lastError: any = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as any)?.error?.message || `API error ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as T;
      return { ok: true, data };
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      logDebug(`API call attempt ${attempt + 1}/${retryCount} failed: ${errorMsg}`, 'warn', {
        url,
        attempt: attempt + 1,
        error: errorMsg,
      });

      if (attempt < retryCount - 1) {
        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const finalError = lastError instanceof Error ? lastError.message : 'API call failed after retries';
  logDebug(`API call failed after ${retryCount} attempts: ${finalError}`, 'error', { url });

  return { ok: false, error: finalError };
}

/**
 * Validate numeric input within range
 */
export function validateNumeric(
  value: any,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return { valid: true };
}

/**
 * Validate date is in future
 */
export function validateFutureDate(date: Date, fieldName: string): { valid: boolean; error?: string } {
  if (date <= new Date()) {
    return { valid: false, error: `${fieldName} must be in the future` };
  }
  return { valid: true };
}

/**
 * Validate required string field
 */
export function validateRequired(value: string, fieldName: string): { valid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (value.length > 500) {
    return { valid: false, error: `${fieldName} must be less than 500 characters` };
  }

  return { valid: true };
}
