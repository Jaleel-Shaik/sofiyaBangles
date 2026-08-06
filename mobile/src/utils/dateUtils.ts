/**
 * IST (Indian Standard Time) date formatting utilities for the Mobile app.
 *
 * Timestamps are stored in the database as UTC ISO strings.
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
  try {
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
  } catch {
    // Fallback: manual IST calculation (UTC+5:30)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    const dd = String(ist.getUTCDate()).padStart(2, "0");
    const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = ist.getUTCFullYear();
    let hh = ist.getUTCHours();
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    const min = String(ist.getUTCMinutes()).padStart(2, "0");
    const sec = String(ist.getUTCSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${String(hh).padStart(2, "0")}:${min}:${sec} ${ampm}`;
  }
};

/**
 * Formats timestamp to just the date portion in IST: "03/08/2026"
 */
export const formatISTDate = (date?: string | Date | null): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    const dd = String(ist.getUTCDate()).padStart(2, "0");
    const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${ist.getUTCFullYear()}`;
  }
};

/**
 * Returns a human-readable relative time string,
 * falling back to full IST formatted date for older ones.
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
