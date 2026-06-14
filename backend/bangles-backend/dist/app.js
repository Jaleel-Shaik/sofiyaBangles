"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const favorite_routes_1 = __importDefault(require("./routes/favorite.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
// Middleware
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
// ─── Security ────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: "*", // TODO: restrict to your domains in production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// ─── Rate Limiting ───────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});
app.use("/api/auth", limiter);
// ─── Body Parsing ────────────────────────────────────────
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Logging ─────────────────────────────────────────────
app.use((0, morgan_1.default)("dev"));
// ─── Health Check ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Sofiya Bangles API is running 🚀",
        timestamp: new Date().toISOString(),
    });
});
// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", auth_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/favorites", favorite_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/analytics", analytics_routes_1.default);
// ─── Error Handling ──────────────────────────────────────
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
