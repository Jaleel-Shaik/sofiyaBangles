import { classifyApiError, ClassifiedApiError } from "@/src/api/errors";
import { useErrorLogStore } from "../store/errorLogStore";

/**
 * Single entry point for recording an API failure.
 * Classifies the raw axios error, stores it in the error log (used by the
 * Error Center page) and returns the classified result so the caller can
 * decide whether to also raise the global popup.
 */
export function logApiError(error: any, url?: string): ClassifiedApiError {
  const apiError = classifyApiError(error, url);
  const attemptedUrl = url ?? error?.config?.url ?? "";

  useErrorLogStore.getState().addError({
    type: apiError.type,
    statusCode: apiError.statusCode,
    title: apiError.title,
    message: apiError.message,
    technical: apiError.technical,
    retriable: apiError.retriable,
    systemic: apiError.systemic,
    url: attemptedUrl,
  });

  return apiError;
}
