import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types";

/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 *
 * @param roles - Allowed roles for this route
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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
