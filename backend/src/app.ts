import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./shared/config/env";
import { corsOptions } from "./shared/config/cors";
import { errorHandler } from "./shared/middlewares/error.middleware";
import { apiLogMiddleware } from "./shared/middlewares/apiLog.middleware";
import apiRouter from "./api";

const app = express();
app.use(cors(corsOptions));

app.use(helmet({
  // Allow cross-origin API consumption (frontend on different port/domain)
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable CSP for API server — it serves JSON, not HTML pages
  contentSecurityPolicy: false,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { firebaseCredentialSource, firebaseInitError } from "./shared/config/firebase";

// Health check endpoints for Docker container health checks & load balancers
app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({
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

// Root API endpoint
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
      "/api/super-admin",
    ],
  });
});

app.use("/api", apiRouter);
app.use(apiLogMiddleware);
app.use(errorHandler);
export default app;
