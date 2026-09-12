import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponseOptions<T> {
  statusCode?: number;
  message?: string;
  meta?: Record<string, unknown>;
  pagination?: PaginationMeta;
}

/**
 * Sends a structured, consistent success response.
 * Compatible with Web Admin (extractData, pagination) and Mobile (res.data.data).
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  options?: string | ApiResponseOptions<T>
): Response => {
  const opts: ApiResponseOptions<T> =
    typeof options === "string" ? { message: options } : options || {};

  const statusCode = opts.statusCode || 200;

  const payload: Record<string, unknown> = {
    success: true,
    data,
  };

  if (opts.message) {
    payload.message = opts.message;
  }

  if (opts.pagination) {
    const totalPages =
      opts.pagination.totalPages !== undefined
        ? opts.pagination.totalPages
        : Math.ceil((opts.pagination.total || 0) / (opts.pagination.limit || 20));

    payload.pagination = {
      ...opts.pagination,
      totalPages,
    };
  }

  if (opts.meta) {
    payload.meta = opts.meta;
  }

  return res.status(statusCode).json(payload);
};
