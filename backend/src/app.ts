import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./shared/config/env";
import { corsOptions } from "./shared/config/cors";
import { errorHandler, notFoundHandler } from "./shared/middlewares/error.middleware";
import { apiLogMiddleware } from "./shared/middlewares/apiLog.middleware";
import { requestIdMiddleware } from "./core/middlewares/request-id.middleware";
import { generalApiLimiter } from "./core/middlewares/rate-limit.middleware";
import { firebaseCredentialSource, firebaseInitError } from "./shared/config/firebase";
import apiRouter from "./api";

const app = express();

// 1. Request correlation tracing
app.use(requestIdMiddleware);

// 2. Security & Cross-Origin
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// 3. Logging & Parsing
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Rate Limiting for general traffic
app.use("/api", generalApiLimiter);

// 5. API Failure Audit Logging (Must wrap before routes to listen on res finish)
app.use(apiLogMiddleware);

// 6. Health check endpoints
app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    service: "sofiya-bangles-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    firebase: {
      source: firebaseCredentialSource,
      ready: firebaseCredentialSource !== "none" && !firebaseCredentialSource.includes("unconfigured"),
      error: firebaseInitError,
    },
  });
});

// 7. Root API endpoint
app.get("/api", (_req, res) => {
  res.status(200).json({
    message: "Sofiya Bangles API",
    version: "1.0.0",
    endpoints: [
      "/api/health",
      "/api/auth",
      "/api/products",
      "/api/categories",
      "/api/favorites",
      "/api/users",
      "/api/settings",
      "/api/analytics",
      "/api/notifications",
      "/api/model-types",
      "/api/size-preferences",
      "/api/orders",
      "/api/cart",
      "/api/super-admin",
    ],
  });
});

// 8. Core API routes
app.use("/api", apiRouter);

// 9. 404 Route handler
app.use(notFoundHandler);

// 10. Global central error handler
app.use(errorHandler);

export default app;
