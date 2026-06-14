"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
/**
 * Centralized error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
const errorHandler = (err, _req, res, _next) => {
    console.error("❌ Unhandled Error:", err.message);
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "An unexpected error occurred. Please try again later.",
        ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
};
exports.errorHandler = errorHandler;
/**
 * 404 handler for unknown routes.
 */
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
};
exports.notFoundHandler = notFoundHandler;
