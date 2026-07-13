import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("❌ Unhandled Error:", err.message);

  if (err instanceof ZodError || err.name === "ZodError") {
    const issues = (err as any).errors || (err as any).issues || [];
    const message = issues.map((e: any) => e.message).join(", ");
    res.status(400).json({ success: false, message });
    return;
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, message: "File size exceeds the 5MB limit." });
      return;
    }
    res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    return;
  }

  if (err.message === "ONLY_IMAGES_ALLOWED") {
    res.status(400).json({ success: false, message: "Only image files (JPG, PNG, WEBP) are allowed." });
    return;
  }

  if (err.name === "SyntaxError" && "body" in err) {
    res.status(400).json({ success: false, message: "Malformed JSON payload in request body." });
    return;
  }

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.status || err.statusCode ? err.message : "An unexpected error occurred. Please try again later.",
    ...(process.env.NODE_ENV === "development" && { error: err.message, stack: err.stack }),
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
