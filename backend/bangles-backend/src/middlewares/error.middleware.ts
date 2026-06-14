import { Request, Response, NextFunction } from "express";

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("❌ Unhandled Error:", err.message);
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again later.",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};

/**
 * 404 handler for unknown routes.
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
};
