import { Router } from "express";

import authRoutes from "../features/auth/routes/auth.routes";
import productRoutes from "../features/product/routes/product.routes";
import categoryRoutes from "../features/category/routes/category.routes";
import favoriteRoutes from "../features/favorite/routes/favorite.routes";
import userRoutes from "../features/user/routes/user.routes";
import settingsRoutes from "../features/settings/routes/settings.routes";
import analyticsRoutes from "../features/analytics/routes/analytics.routes";
import notificationRoutes from "../features/notification/routes/notification.routes";
import modelTypeRoutes from "../features/model-type/routes/modelType.routes";
import sizePreferenceRoutes from "../features/size-preference/routes/sizePreference.routes";
import orderRoutes from "../features/order/routes/order.routes";
import superAdminRoutes from "../features/super-admin/routes/superAdmin.routes";
import cartRoutes from "../features/cart/routes/cart.routes";

import { authenticate, optionalAuthenticate } from "../shared/middlewares/auth.middleware";
import { validate } from "../shared/middlewares/validate.middleware";
import { getProductReviews, createReview } from "../features/order/controllers/order.controller";
import { createReviewSchema } from "../features/order/validations/order.validation";
import { getAllModelTypes } from "../features/model-type/controllers/modelType.controller";
import { getSizePreferences } from "../features/size-preference/controllers/sizePreference.controller";

const apiRouter = Router();

// Compatibility alias: /api/categories/models -> model types
apiRouter.get("/categories/models", getAllModelTypes);

// Compatibility alias: /api/users/favorites -> favoriteRoutes
apiRouter.use("/users/favorites", favoriteRoutes);

// Compatibility alias: /api/users/preferences -> size preferences
apiRouter.get("/users/preferences", authenticate, getSizePreferences);

// Compatibility alias: /api/reviews -> product reviews
const reviewCompatRouter = Router();
reviewCompatRouter.get("/:productId", optionalAuthenticate, getProductReviews);
reviewCompatRouter.post("/", authenticate, validate(createReviewSchema), createReview);
apiRouter.use("/reviews", reviewCompatRouter);

// Core feature routers
apiRouter.use("/auth", authRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/favorites", favoriteRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/model-types", modelTypeRoutes);
apiRouter.use("/size-preferences", sizePreferenceRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/cart", cartRoutes);
apiRouter.use("/super-admin", superAdminRoutes);

export default apiRouter;
