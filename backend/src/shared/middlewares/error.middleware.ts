import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { AppError } from "../../core/errors/app.error";

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isErrorObject = err !== null && typeof err === "object";
  const errName = isErrorObject && "name" in err && typeof err.name === "string" ? err.name : "";
  const errMessage = isErrorObject && "message" in err && typeof err.message === "string" ? err.message : String(err);
  const errStack = isErrorObject && "stack" in err && typeof err.stack === "string" ? err.stack : undefined;
  const requestId = req.id || (req.headers["x-request-id"] as string) || undefined;

  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let clientMessage = "An unexpected error occurred. Please try again later.";
  let errorDetails: Record<string, unknown> | unknown[] | undefined = undefined;

  // 1. Typed AppError hierarchy
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    clientMessage = err.message;
    errorDetails = err.details;
  }
  // 2. Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    clientMessage = err.issues.map((e) => e.message).join(", ");
    errorDetails = err.issues;
  } else if (errName === "ZodError" && isErrorObject && ("issues" in err || "errors" in err)) {
    const rawIssues =
      ("issues" in err
        ? (err as { issues: Array<{ message?: string }> }).issues
        : (err as { errors: Array<{ message?: string }> }).errors) || [];
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    clientMessage = rawIssues.map((e) => e.message || "Invalid input").join(", ");
    errorDetails = rawIssues;
  }
  // 3. Multer file upload errors
  else if (err instanceof multer.MulterError || errName === "MulterError") {
    statusCode = 400;
    errorCode = "FILE_UPLOAD_ERROR";
    const multerCode = isErrorObject && "code" in err ? (err as { code: unknown }).code : "";
    if (multerCode === "LIMIT_FILE_SIZE") {
      clientMessage = "File size exceeds the 5MB limit.";
    } else if (multerCode === "LIMIT_UNEXPECTED_FILE") {
      clientMessage = "Maximum 7 images allowed per product.";
    } else {
      clientMessage = `Upload error: ${errMessage}`;
    }
  } else if (errMessage === "ONLY_IMAGES_ALLOWED") {
    statusCode = 400;
    errorCode = "INVALID_FILE_TYPE";
    clientMessage = "Only image files (JPG, PNG, WEBP) are allowed.";
  }
  // 4. Malformed JSON payload
  else if (errName === "SyntaxError" && isErrorObject && "body" in err) {
    statusCode = 400;
    errorCode = "MALFORMED_JSON";
    clientMessage = "Malformed JSON payload in request body.";
  }
  // 5. Explicit status codes on generic errors
  else if (
    isErrorObject &&
    ("status" in err && typeof (err as { status: unknown }).status === "number"
      ? true
      : "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number")
  ) {
    const rawCode =
      "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : (err as { statusCode: number }).statusCode;
    statusCode = rawCode;
    if (statusCode < 500) {
      clientMessage = errMessage;
      errorCode = isErrorObject && "code" in err && typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : "BAD_REQUEST";
    }
  }

  // Structured console logging
  if (statusCode >= 500) {
    console.error(`❌ [${requestId || "NO_REQ_ID"}] 500 Server Error:`, err);
  } else {
    console.warn(`⚠️ [${requestId || "NO_REQ_ID"}] ${statusCode} ${errorCode}: ${clientMessage}`);
  }

  const isDev = process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    error: {
      code: errorCode,
      message: clientMessage,
      ...(errorDetails && { details: errorDetails }),
    },
    ...(requestId && { requestId }),
    ...(isDev && statusCode >= 500 && { stack: errStack }),
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
  const requestId = req.id || (req.headers["x-request-id"] as string) || undefined;
  const message = `Route ${req.method} ${req.originalUrl} not found.`;

  res.status(404).json({
    success: false,
    message,
    error: {
      code: "ROUTE_NOT_FOUND",
      message,
    },
    ...(requestId && { requestId }),
  });
};
