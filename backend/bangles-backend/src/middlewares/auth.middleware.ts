import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, JwtPayload } from "../types";

/**
 * Verifies the JWT token from Authorization header.
 * Attaches decoded user to `req.user`.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid token.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

/**
 * Generates a JWT token for a user.
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string & { __brand?: never },
  } as jwt.SignOptions);
};
