import { CorsOptions } from "cors";
import { env } from "./env";

/**
 * Production-grade CORS configuration.
 *
 * Behavior:
 * - Development (NODE_ENV !== "production"):
 *     Allows ALL origins so local dev with multiple ports works seamlessly.
 *
 * - Production (NODE_ENV === "production"):
 *     Only allows origins explicitly listed in CORS_ORIGINS env var.
 *     Rejects requests from unlisted origins with a clear error.
 *
 * Usage in .env:
 *   CORS_ORIGINS=http://localhost:3000,https://admin.sofiyabangles.com,https://sofiyabangles.com
 */

function buildAllowedOrigins(): string[] {
  if (!env.CORS_ORIGINS) return [];
  return env.CORS_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // In development, allow everything
    if (env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // In production, check against the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject unknown origins
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Headers the client can send
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],

  // Headers the client can read from the response
  exposedHeaders: [
    "X-Total-Count",    // pagination
    "X-Request-Id",     // request tracking
  ],

  // Cache preflight responses for 10 minutes (reduces OPTIONS requests)
  maxAge: 600,
};
