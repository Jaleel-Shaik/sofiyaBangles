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

/**
 * Safely extracts and bounds pagination parameters (page >= 1, 1 <= limit <= 100).
 */
export const getPagination = (req: Request): { page: number; limit: number } => {
  const rawPage = Number(getQuery(req, "page"));
  const rawLimit = Number(getQuery(req, "limit"));
  const page = !isNaN(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 20;
  return { page, limit };
};
