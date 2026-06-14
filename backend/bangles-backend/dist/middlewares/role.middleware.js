"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 *
 * @param roles - Allowed roles for this route
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action.",
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
