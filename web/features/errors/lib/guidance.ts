export type ErrorRole = "admin" | "super_admin";

export interface ErrorGuidance {
  what: string;
  why: string;
  actions: string[];
}

export interface ErrorTypeMeta {
  label: string;
  icon: string;
  badge: string;
  text: string;
  dot: string;
}

export const TYPE_META: Record<string, ErrorTypeMeta> = {
  TIMEOUT: {
    label: "Timeout",
    icon: "Clock",
    badge: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  NETWORK: {
    label: "Network",
    icon: "WifiOff",
    badge: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  OFFLINE: {
    label: "Offline",
    icon: "Wifi",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  SERVER: {
    label: "Server",
    icon: "Server",
    badge: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  UNAUTHORIZED: {
    label: "Session",
    icon: "Lock",
    badge: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  FORBIDDEN: {
    label: "Permission",
    icon: "ShieldAlert",
    badge: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  NOT_FOUND: {
    label: "Not Found",
    icon: "HelpCircle",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  VALIDATION: {
    label: "Validation",
    icon: "AlertCircle",
    badge: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  UNKNOWN: {
    label: "Unknown",
    icon: "HelpCircle",
    badge: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

const base: Record<string, Pick<ErrorGuidance, "what" | "why">> = {
  TIMEOUT: {
    what: "The dashboard asked the backend for data, but the backend did not reply in time.",
    why: "The backend is slow or overloaded, or the API URL points to a server that is no longer reachable.",
  },
  NETWORK: {
    what: "The dashboard could not reach the backend at all.",
    why: "The backend is not running, the API URL is wrong, or there is a network problem between this browser and the server.",
  },
  OFFLINE: {
    what: "There is no internet connection in this browser.",
    why: "Airplane mode, no Wi-Fi, or the network went down.",
  },
  SERVER: {
    what: "The backend hit an error while handling the request.",
    why: "A bug or crash in the backend (HTTP 500 / 502 / 503).",
  },
  UNAUTHORIZED: {
    what: "Your admin session is no longer valid.",
    why: "The login expired or the account was signed out.",
  },
  FORBIDDEN: {
    what: "This admin account is not allowed to perform that action.",
    why: "The account role does not have permission for this operation.",
  },
  NOT_FOUND: {
    what: "The requested resource does not exist.",
    why: "It may have been deleted, or the link is old.",
  },
  VALIDATION: {
    what: "The backend rejected the submitted data.",
    why: "One or more fields are missing, empty, or in the wrong format.",
  },
  UNKNOWN: {
    what: "Something unexpected went wrong.",
    why: "An unusual error that does not fit a known category.",
  },
};

const actions: Record<string, string[]> = {
  TIMEOUT: [
    "Retry the request — the backend may just have been busy.",
    "Check that the backend is running (npm run dev in backend/).",
    "Confirm the API URL in the browser points to the correct server.",
  ],
  NETWORK: [
    "Verify the backend is running and listening on port 5000.",
    "Check the API URL this portal uses (NEXT_PUBLIC_API_URL) — it may still point to an old IP after a network change.",
    "Confirm this browser and the backend can reach each other.",
  ],
  OFFLINE: ["Check this device's internet connection."],
  SERVER: [
    "Open the backend terminal / logs and find the stack trace for this request.",
    "Restart the backend and try again.",
  ],
  UNAUTHORIZED: ["Log in again from the login page."],
  FORBIDDEN: [
    "Use an account whose role allows this action.",
    "If an admin should be allowed, check role assignments.",
  ],
  NOT_FOUND: ["Refresh the list — the item may have been removed."],
  VALIDATION: ["Check the highlighted fields and submit again."],
  UNKNOWN: ["Retry the action, then inspect the backend logs if it keeps failing."],
};

export function getGuidance(type: string): ErrorGuidance {
  const entry = base[type] ?? base.UNKNOWN;
  return {
    ...entry,
    actions: actions[type] ?? actions.UNKNOWN,
  };
}

export function getRoleBanner(role: ErrorRole): string {
  if (role === "super_admin") {
    return "Full technical details are shown below. For Server errors check the backend logs; for Network errors verify the API URL is current.";
  }
  return "Technical details are shown below. Use the suggested fixes to resolve connection and server issues.";
}
