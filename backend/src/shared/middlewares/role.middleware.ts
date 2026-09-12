import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types";
import { UnauthorizedError, ForbiddenError } from "../../core/errors/app.error";

/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 *
 * @param roles - Allowed roles for this route
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to perform this action."));
    }

    next();
  };
};
