"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Validates request body against a Zod schema.
 * Returns 400 with detailed validation errors on failure.
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
exports.validate = validate;
/**
 * Validates request query parameters against a Zod schema.
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req.query);
            // Assign parsed values back without replacing the query object type
            Object.assign(req.query, parsed);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
exports.validateQuery = validateQuery;
