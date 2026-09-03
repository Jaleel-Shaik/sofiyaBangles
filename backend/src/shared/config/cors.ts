import { CorsOptions } from "cors";
import { env } from "./env";

/**
 * Production-grade CORS configuration.
 *
 * Behavior:
 * - Development (NODE_ENV !== "production"):
 *     Allows ALL origins.
 *
 * - Production (NODE_ENV === "production"):
 *     1. Allows any origin listed in CORS_ORIGINS env var.
 *     2. Automatically allows all *.vercel.app preview & production deployments.
 *     3. Automatically allows localhost/127.0.0.1 for local dev/testing.
 *     4. Requests with no origin (native Expo apps, cURL, server-to-server) are allowed.
 *     5. Rejects unlisted origins cleanly without throwing a 500 error.
 */

function isOriginAllowed(origin: string): boolean {
  const originsFromEnv = (process.env.CORS_ORIGINS || env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  const lowerOrigin = origin.toLowerCase();

  // Direct match from env
  if (originsFromEnv.some((allowed) => allowed === lowerOrigin)) {
    return true;
  }

  // Allow all Vercel deployment URLs (production, git branch previews, commit previews)
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "vercel.app" || hostname.endsWith(".vercel.app")) {
      return true;
    }
    // Allow local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }
  } catch {
    // Malformed origin URL
  }

  return false;
}

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

    // Check allowed origins
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    // Cleanly reject unknown origins without throwing a 500 Internal Server Error
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(null, false);
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
    "x-client-type",
    "x-client-version",
  ],

  // Headers the client can read from the response
  exposedHeaders: [
    "X-Total-Count",    // pagination
    "X-Request-Id",     // request tracking
  ],

  // Cache preflight responses for 10 minutes (reduces OPTIONS requests)
  maxAge: 600,
  optionsSuccessStatus: 204,
};

