import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isErrorObject = err !== null && typeof err === "object";
  const errName = isErrorObject && "name" in err && typeof err.name === "string" ? err.name : "";
  const errMessage = isErrorObject && "message" in err && typeof err.message === "string" ? err.message : String(err);
  const errStack = isErrorObject && "stack" in err && typeof err.stack === "string" ? err.stack : undefined;

  console.error("❌ Unhandled Error:", errMessage);

  if (err instanceof ZodError) {
    const message = err.issues.map((e) => e.message).join(", ");
    res.status(400).json({ success: false, message });
    return;
  }

  if (errName === "ZodError" && isErrorObject && ("issues" in err || "errors" in err)) {
    const rawIssues = (("issues" in err ? (err as { issues: Array<{ message?: string }> }).issues : (err as { errors: Array<{ message?: string }> }).errors)) || [];
    const message = rawIssues.map((e) => e.message || "Invalid input").join(", ");
    res.status(400).json({ success: false, message });
    return;
  }

  if (err instanceof multer.MulterError || errName === "MulterError") {
    const multerCode = isErrorObject && "code" in err ? (err as { code: unknown }).code : "";
    if (multerCode === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, message: "File size exceeds the 5MB limit." });
      return;
    }
    if (multerCode === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ success: false, message: "Maximum 7 images allowed per product." });
      return;
    }
    res.status(400).json({ success: false, message: `Upload error: ${errMessage}` });
    return;
  }

  if (errMessage === "ONLY_IMAGES_ALLOWED") {
    res.status(400).json({ success: false, message: "Only image files (JPG, PNG, WEBP) are allowed." });
    return;
  }

  if (errName === "SyntaxError" && isErrorObject && "body" in err) {
    res.status(400).json({ success: false, message: "Malformed JSON payload in request body." });
    return;
  }

  const statusCode =
    (isErrorObject &&
      ("status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 500)) || 500;

  const clientMessage =
    statusCode < 500
      ? errMessage
      : "An unexpected error occurred. Please try again later.";

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(process.env.NODE_ENV === "development" && { error: errMessage, stack: errStack }),
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
