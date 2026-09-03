import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./shared/config/env";
import { corsOptions } from "./shared/config/cors";
import { errorHandler } from "./shared/middlewares/error.middleware";
import { apiLogMiddleware } from "./shared/middlewares/apiLog.middleware";
import authRoutes from "./features/auth/routes/auth.routes";
import productRoutes from "./features/product/routes/product.routes";
import categoryRoutes from "./features/category/routes/category.routes";
import favoriteRoutes from "./features/favorite/routes/favorite.routes";
import userRoutes from "./features/user/routes/user.routes";
import settingsRoutes from "./features/settings/routes/settings.routes";
import analyticsRoutes from "./features/analytics/routes/analytics.routes";
import notificationRoutes from "./features/notification/routes/notification.routes";
import modelTypeRoutes from "./features/model-type/routes/modelType.routes";
import sizePreferenceRoutes from "./features/size-preference/routes/sizePreference.routes";
import orderRoutes from "./features/order/routes/order.routes";

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

// Health check endpoints for Docker container health checks & load balancers
app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "sofiya-bangles-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/model-types", modelTypeRoutes);
app.use("/api/size-preferences", sizePreferenceRoutes);
app.use("/api/orders", orderRoutes);
app.use(apiLogMiddleware);
app.use(errorHandler);
export default app;
