import { Response, NextFunction } from "express";
import { AuthRequest, Platform } from "../types";
import { UnauthorizedError, ForbiddenError } from "../../core/errors/app.error";

/**
 * Platform authorization middleware.
 * Must be used AFTER authenticate middleware.
 *
 * @param platforms - Allowed platforms for this route (e.g. "web", "mobile")
 */
export const requirePlatform = (...platforms: Platform[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!req.user.platform || !platforms.includes(req.user.platform)) {
      return next(
        new ForbiddenError(`Platform access denied. This route only allows: ${platforms.join(", ")}.`)
      );
    }

    next();
  };
};
