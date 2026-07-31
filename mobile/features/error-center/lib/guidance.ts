export type ErrorRole = "user" | "admin" | "super_admin" | "guest";

export interface ErrorGuidance {
  what: string;
  why: string;
  actions: string[];
}

export interface ErrorTypeMeta {
  label: string;
  icon: any;
  badge: string;
  text: string;
  dot: string;
}

export const TYPE_META: Record<string, ErrorTypeMeta> = {
  TIMEOUT: {
    label: "Timeout",
    icon: "time-outline",
    badge: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  NETWORK: {
    label: "Network",
    icon: "cloud-offline-outline",
    badge: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  OFFLINE: {
    label: "Offline",
    icon: "wifi-outline",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  SERVER: {
    label: "Server",
    icon: "server-outline",
    badge: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  UNAUTHORIZED: {
    label: "Session",
    icon: "lock-closed-outline",
    badge: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  FORBIDDEN: {
    label: "Permission",
    icon: "shield-outline",
    badge: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  NOT_FOUND: {
    label: "Not Found",
    icon: "help-circle-outline",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  VALIDATION: {
    label: "Validation",
    icon: "alert-circle-outline",
    badge: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  UNKNOWN: {
    label: "Unknown",
    icon: "help-circle-outline",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

function baseGuidance(): Record<string, Pick<ErrorGuidance, "what" | "why">> {
  return {
    TIMEOUT: {
      what: "The app asked the server for data, but the server did not reply in time.",
      why: "Usually a slow internet connection, a busy server, or the server address still pointing to an old IP after you changed WiFi / place.",
    },
    NETWORK: {
      what: "The app could not reach the server at all.",
      why: "The phone and the computer running the backend are on different networks, the server's IP changed, or the backend is not running.",
    },
    OFFLINE: {
      what: "There is no internet connection on this device.",
      why: "Airplane mode, no mobile data, or no Wi-Fi signal.",
    },
    SERVER: {
      what: "The server hit a problem while handling the request.",
      why: "A bug or temporary issue on the backend (HTTP 500 / 502 / 503).",
    },
    UNAUTHORIZED: {
      what: "Your session is no longer valid.",
      why: "The login expired, or the account was signed out / disabled.",
    },
    FORBIDDEN: {
      what: "This account is not allowed to perform that action.",
      why: "The account role does not have permission for this operation.",
    },
    NOT_FOUND: {
      what: "The item or page you requested does not exist.",
      why: "It may have been deleted, or the link you used is old.",
    },
    VALIDATION: {
      what: "The server rejected the data you submitted.",
      why: "One or more fields are missing, empty, or in the wrong format.",
    },
    UNKNOWN: {
      what: "Something unexpected went wrong.",
      why: "An unusual error that does not fit a known category.",
    },
  };
}

const TECHNICAL_ACTIONS: Record<string, string[]> = {
  TIMEOUT: [
    "Open Profile → Server Connection and press “Test Connection”.",
    "Make sure the backend is running (in backend/ run npm run dev).",
    "Check if the phone and computer are on the same WiFi network.",
  ],
  NETWORK: [
    "Open Profile → Server Connection and update the URL to the current IP (run ipconfig on Windows / ifconfig on macOS to find it).",
    "Make sure the phone and the backend computer are on the same network.",
    "Confirm the backend server is running and listening on port 5000.",
  ],
  OFFLINE: ["Check the device internet connection before opening the app."],
  SERVER: [
    "Look at the backend terminal / logs for a stack trace related to this request.",
    "Restart the backend and try again.",
  ],
  UNAUTHORIZED: ["Log in again. If it persists, verify the account is active."],
  FORBIDDEN: [
    "Use an account with the correct role for this action.",
    "If an admin should be allowed, check role assignments.",
  ],
  NOT_FOUND: ["Refresh the list — the item may have been removed."],
  VALIDATION: ["Check the highlighted fields and submit again."],
  UNKNOWN: ["Retry the action, then contact the developer if it keeps failing."],
};

const USER_ACTIONS: Record<string, string[]> = {
  TIMEOUT: [
    "Check your internet connection.",
    "Wait a moment, then tap Retry.",
    "If it keeps happening, contact support.",
  ],
  NETWORK: [
    "Make sure you are connected to the internet.",
    "If you just moved to a new WiFi / place, close and reopen the app.",
    "Contact support if the problem continues.",
  ],
  OFFLINE: [
    "Turn off Airplane mode or connect to Wi-Fi / mobile data, then try again.",
  ],
  SERVER: [
    "Try again in a few moments.",
    "Contact support if it keeps happening.",
  ],
  UNAUTHORIZED: ["Please log in again to continue."],
  FORBIDDEN: [
    "This account cannot do that. Contact support if you think this is wrong.",
  ],
  NOT_FOUND: ["Go back and refresh the list — the item may no longer exist."],
  VALIDATION: ["Check your input and try again."],
  UNKNOWN: ["Try again, and contact support if it keeps failing."],
};

/**
 * Role-aware guidance for an error type.
 *   user/guest   → plain language, no technical detail
 *   admin        → adds troubleshooting steps (server connection, backend)
 *   super_admin  → everything an admin sees plus the raw endpoint details
 */
export function getGuidance(type: string, role: ErrorRole): ErrorGuidance {
  const base = baseGuidance()[type] ?? baseGuidance().UNKNOWN;

  if (role === "admin" || role === "super_admin") {
    return {
      ...base,
      actions: TECHNICAL_ACTIONS[type] ?? TECHNICAL_ACTIONS.UNKNOWN,
    };
  }

  return {
    ...base,
    actions: USER_ACTIONS[type] ?? USER_ACTIONS.UNKNOWN,
  };
}

export function getRoleBanner(role: ErrorRole): string {
  switch (role) {
    case "admin":
      return "You can see the technical details below. Use Profile → Server Connection to fix address / connection problems.";
    case "super_admin":
      return "Full technical details are shown. For Server errors check the backend logs; for Network errors update the Server Connection URL.";
    default:
      return "These are the issues this app ran into. Try the suggested fix, or contact support if it keeps happening.";
  }
}

export function getRoleLabel(role: ErrorRole): string {
  return role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "user" ? "User" : "Guest";
}
