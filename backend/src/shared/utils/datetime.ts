/**
 * Indian Standard Time (UTC+05:30) helpers.
 *
 * All display-oriented timestamps (audit logs, profile created_at/updated_at)
 * are stored as ISO 8601 strings carrying the +05:30 offset, e.g.
 * "2026-07-31T15:23:28.148+05:30". This keeps the value readable as Indian
 * local time while remaining lexicographically sortable for Firestore queries.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const toISTISO = (
  date: Date | string | null | undefined,
): string | null => {
  if (date === null || date === undefined || date === "") return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().replace("Z", "+05:30");
};

export const nowISTISO = (): string =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().replace("Z", "+05:30");

/** Formats a timestamp as an Indian-style readable string: DD/MM/YYYY hh:mm:ss AM/PM */
export const formatISTReadable = (
  date: Date | string | null | undefined,
): string => {
  if (date === null || date === undefined || date === "") return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = ist.getUTCFullYear();
  let hh = ist.getUTCHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const min = String(ist.getUTCMinutes()).padStart(2, "0");
  const sec = String(ist.getUTCSeconds()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec} ${ampm}`;
};
