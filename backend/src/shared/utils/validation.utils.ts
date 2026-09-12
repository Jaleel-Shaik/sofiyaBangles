import { z } from "zod";

/**
 * Parses a string to a number if it's a string, or keeps it as a number.
 * Useful for fields like price and quantity that might come as strings in multipart/form-data.
 */
export const zStringNumber = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val));

/**
 * Parses a string to a boolean.
 * Treats true and "true" as true, and false and "false" as false.
 */
export const zStringBoolean = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === "true");

/**
 * Parses a JSON stringified array into an actual array.
 * Useful for arrays coming in multipart/form-data.
 */
export const zJsonArray = z
  .union([z.array(z.any()), z.string()])
  .transform((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        return [trimmed];
      }
    }
    return Array.isArray(val) ? val : [val];
  });
