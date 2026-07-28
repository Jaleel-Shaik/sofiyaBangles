import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validates request body against a Zod schema.
 * Returns 400 with detailed validation errors on failure.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.map(String).join("."),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed.",
          errors,
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Validates request query parameters against a Zod schema.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // Assign parsed values back without replacing the query object type
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.map(String).join("."),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          message: "Invalid query parameters.",
          errors,
        });
        return;
      }

      next(error);
    }
  };
};
