import type { AxiosError } from "axios";

export type ApiErrorType =
  | "TIMEOUT"
  | "OFFLINE"
  | "NETWORK"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "SERVER"
  | "UNKNOWN";

export interface ClassifiedApiError {
  type: ApiErrorType;
  statusCode?: number;
  title: string;
  message: string;
  technical?: string;
  retriable: boolean;
  systemic: boolean;
}

function serverMessage(error: AxiosError, fallback: string): string {
  const data = error.response?.data as any;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }
  return fallback;
}

export function classifyApiError(error: any, url?: string): ClassifiedApiError {
  const attemptedUrl = url || error?.config?.url || "";

  if (!error?.response) {
    if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message || "")) {
      return {
        type: "TIMEOUT",
        title: "Request Timed Out",
        message:
          "The server did not respond in time. Check your connection and try again.",
        technical: `Timed out while calling ${attemptedUrl}`,
        retriable: true,
        systemic: true,
      };
    }

    if (error?.code === "ERR_NETWORK" || /network error|network request failed/i.test(error?.message || "")) {
      return {
        type: "NETWORK",
        title: "Cannot Reach Server",
        message:
          "Could not establish a connection to the backend. Make sure it is running and the API URL is correct.",
        technical: `${error?.message || "Network error"} → ${attemptedUrl}`,
        retriable: true,
        systemic: true,
      };
    }

    return {
      type: "NETWORK",
      title: "No Internet Connection",
      message: "You appear to be offline. Check your internet connection and try again.",
      technical: `${error?.message || "Unknown network error"} → ${attemptedUrl}`,
      retriable: true,
      systemic: true,
    };
  }

  const status = error.response.status;

  if (status === 401) {
    return {
      type: "UNAUTHORIZED",
      statusCode: status,
      title: "Session Expired",
      message: "Your session has expired. Please log in again.",
      technical: serverMessage(error, "Unauthorized"),
      retriable: false,
      systemic: false,
    };
  }

  if (status === 403) {
    return {
      type: "FORBIDDEN",
      statusCode: status,
      title: "Access Denied",
      message: serverMessage(error, "You do not have permission to perform this action."),
      technical: serverMessage(error, "Forbidden"),
      retriable: false,
      systemic: false,
    };
  }

  if (status === 404) {
    return {
      type: "NOT_FOUND",
      statusCode: status,
      title: "Not Found",
      message: serverMessage(error, "The requested resource was not found."),
      technical: `${attemptedUrl} returned 404`,
      retriable: false,
      systemic: false,
    };
  }

  if (status === 400 || status === 422) {
    return {
      type: "VALIDATION",
      statusCode: status,
      title: "Invalid Request",
      message: serverMessage(error, "The request was invalid. Please check your input and try again."),
      technical: serverMessage(error, "Bad request"),
      retriable: false,
      systemic: false,
    };
  }

  if (status === 408) {
    return {
      type: "TIMEOUT",
      statusCode: status,
      title: "Request Timed Out",
      message: "The server took too long to respond. Please try again.",
      technical: serverMessage(error, "Request timeout"),
      retriable: true,
      systemic: true,
    };
  }

  if (status >= 500) {
    return {
      type: "SERVER",
      statusCode: status,
      title: `Server Error (${status})`,
      message: serverMessage(error, "Something went wrong on the server. Please try again in a moment."),
      technical: serverMessage(error, "Internal server error"),
      retriable: true,
      systemic: true,
    };
  }

  return {
    type: "UNKNOWN",
    statusCode: status,
    title: `Unexpected Error (${status})`,
    message: serverMessage(error, "Something went wrong. Please try again."),
    technical: error?.message || `HTTP ${status}`,
    retriable: false,
    systemic: false,
  };
}
