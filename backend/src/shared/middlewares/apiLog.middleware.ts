import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { createAuditLogModel } from "../models/audit.model";

const ERROR_STATUS_THRESHOLD = 400;

/**
 * Logs the API problems a user faced into the permanent `audit_logs`
 * collection: which endpoint failed, the HTTP status and the error.
 *
 * Registered after the routes so it wraps the whole request lifecycle;
 * it records every response with status >= 400.
 */
export const apiLogMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  res.on("finish", () => {
    if (res.statusCode < ERROR_STATUS_THRESHOLD) return;
    if (!req.originalUrl || req.originalUrl.startsWith("/api/health")) return;

    const actorId = req.user?.userId || null;
    if (!actorId) return; // unauthenticated failures (bad login) are already audited in auth

    const endpoint = `${req.method} ${req.originalUrl}`;
    const errorMessage = (res.statusMessage || "Request failed").trim();

    createAuditLogModel({
      actor_id: actorId,
      action: "API_FAILURE",
      table_name: null,
      record_id: null,
      api_endpoint: endpoint,
      api_error: errorMessage || "Non-2xx response",
      status_code: res.statusCode,
      ip_address: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "",
    }).catch((err) => console.error("Failed to write API error audit log:", err));
  });

  next();
};
