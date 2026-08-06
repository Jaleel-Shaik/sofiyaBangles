/**
 * IST (Indian Standard Time) date formatting utilities for the Web frontend.
 *
 * Timestamps are stored in the database as UTC ISO strings (e.g. "2026-08-03T05:54:01.000Z").
 * These helpers convert them to IST for display — NEVER use these to store dates back to the DB.
 *
 * Timezone: Asia/Kolkata (UTC+05:30)
 */

/**
 * Formats any UTC/ISO timestamp to IST display format:
 * "03/08/2026, 11:24:01 AM"
 */
export const formatIST = (date?: string | Date | null): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

/**
 * Formats timestamp to just the date portion in IST:
 * "03/08/2026"
 */
export const formatISTDate = (date?: string | Date | null): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formats timestamp to just the time portion in IST:
 * "11:24:01 AM"
 */
export const formatISTTime = (date?: string | Date | null): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

/**
 * Returns a human-readable relative time string for recent events,
 * falling back to full IST formatted date for older ones.
 * e.g. "2 minutes ago", "3 hours ago", or "03/08/2026, 11:24:01 AM"
 */
export const formatISTRelative = (date?: string | Date | null): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
  return formatIST(d);
};
