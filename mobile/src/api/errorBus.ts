import { create } from "zustand";
import { ClassifiedApiError } from "./errors";
import { logApiError } from "@/features/error-center/lib/log";

/**
 * Minimum gap between two popups. When 5+ screens fail at the same time
 * (e.g. server IP changed), we do NOT want to spam 5 modals — we coalesce
 * them into one and suppress repeats for a few seconds after dismissal.
 */
const DEBOUNCE_MS = 6000;

type RetryHandler = (config: any) => Promise<unknown>;

let retryHandler: RetryHandler | null = null;

/**
 * Registered by client.ts so the modal's "Retry" button can re-run the
 * exact failed request without creating a circular import.
 */
export function registerRetryHandler(handler: RetryHandler) {
  retryHandler = handler;
}

interface PendingError {
  apiError: ClassifiedApiError;
  failedUrl: string | null;
  config: any;
  reportedAt: number;
}

interface ApiErrorBusState {
  currentError: PendingError | null;
  isRetrying: boolean;
  lastDismissedAt: number;
  reportError: (error: any, url?: string) => void;
  dismiss: () => void;
  retry: () => Promise<boolean>;
}

export const useApiErrorBus = create<ApiErrorBusState>((set, get) => ({
  currentError: null,
  isRetrying: false,
  lastDismissedAt: 0,

  reportError: (error, url) => {
    // Record every failure in the Error Center log; only connectivity /
    // server failures (systemic) also trigger the global popup.
    const apiError = logApiError(error, url);
    if (!apiError.systemic) return;

    const now = Date.now();
    const { currentError, lastDismissedAt } = get();

    // While a popup is open, refresh its content with the newest failure.
    if (currentError) {
      set({
        currentError: {
          apiError,
          failedUrl: url ?? null,
          config: error?.config ?? null,
          reportedAt: now,
        },
      });
      return;
    }

    // Suppress a brand-new popup right after the user dismissed one
    // (coalescing burst of identical failures).
    if (now - lastDismissedAt < DEBOUNCE_MS) {
      return;
    }

    set({
      currentError: {
        apiError,
        failedUrl: url ?? null,
        config: error?.config ?? null,
        reportedAt: now,
      },
    });
  },

  dismiss: () => {
    set({ currentError: null, lastDismissedAt: Date.now() });
  },

  retry: async () => {
    const { currentError, isRetrying } = get();
    if (!currentError || isRetrying || !retryHandler) {
      set({ currentError: null, lastDismissedAt: Date.now() });
      return false;
    }

    const config = currentError.config;
    // Keep the modal open showing a spinner; on failure the failed request
    // re-reports itself and the modal updates with the fresh error.
    set({ isRetrying: true, currentError: null });
    try {
      await retryHandler(config);
      return true;
    } catch {
      return false;
    } finally {
      set({ isRetrying: false });
    }
  },
}));
