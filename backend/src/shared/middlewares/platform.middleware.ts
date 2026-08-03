import { Response, NextFunction } from "express";
import { AuthRequest, Platform } from "../types";

/**
 * Platform authorization middleware.
 * Must be used AFTER authenticate middleware.
 *
 * @param platforms - Allowed platforms for this route (e.g. "web", "mobile")
 */
export const requirePlatform = (...platforms: Platform[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!req.user.platform || !platforms.includes(req.user.platform)) {
      res.status(403).json({
        success: false,
        message: `Platform access denied. This route only allows: ${platforms.join(", ")}.`,
      });
      return;
    }

    next();
  };
};
