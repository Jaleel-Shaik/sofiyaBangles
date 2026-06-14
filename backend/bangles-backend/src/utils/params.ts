import { Request } from "express";

/**
 * Safely extracts a route parameter as a string.
 * Express v5 types params as `string | string[]`, this normalizes to string.
 */
export const getParam = (req: Request, name: string): string => {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value || "";
};

/**
 * Safely extracts a query parameter as a string or undefined.
 */
export const getQuery = (req: Request, name: string): string | undefined => {
  const value = req.query[name];
  if (Array.isArray(value)) {
    return String(value[0]);
  }
  if (value !== undefined) {
    return String(value);
  }
  return undefined;
};
