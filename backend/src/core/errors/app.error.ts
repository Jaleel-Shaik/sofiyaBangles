/**
 * Universal Backend Architecture - Application Error Hierarchy
 * Provides typed, structured domain errors across all controllers and services.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "PLATFORM_ACCESS_DENIED"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_NOT_SET";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown> | unknown[];

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode | string = "INTERNAL_SERVER_ERROR",
    details?: Record<string, unknown> | unknown[],
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code: ErrorCode | string = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code: ErrorCode | string = "BAD_REQUEST", details?: Record<string, unknown> | unknown[]) {
    super(message, 400, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown> | unknown[]) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code: ErrorCode | string = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", code: ErrorCode | string = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", code: ErrorCode | string = "CONFLICT") {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.", code: ErrorCode | string = "RATE_LIMIT_EXCEEDED") {
    super(message, 429, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred. Please try again later.", code: ErrorCode | string = "INTERNAL_SERVER_ERROR") {
    super(message, 500, code, undefined, false);
  }
}
