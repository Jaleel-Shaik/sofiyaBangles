import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, JwtPayload, UserRole, Platform } from "../types";

import { auth } from "../config/firebase";
import { findIdentityByIdModel } from "../models/identity.model";
import { UnauthorizedError } from "../../core/errors/app.error";

interface DecodedTokenPayload {
  userId?: string;
  uid?: string;
  email?: string;
  role?: string;
  platform?: string;
  [key: string]: unknown;
}

/**
 * Verifies the JWT token from Authorization header.
 * Attaches decoded user to `req.user`.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Authentication required. Please provide a valid token."));
  }

  const token = authHeader.split(" ")[1];

  try {
    let decoded: DecodedTokenPayload;
    let isFirebaseToken = false;

    try {
      // Try verifying as an Express custom JWT first
      decoded = jwt.verify(token, env.JWT_SECRET) as DecodedTokenPayload;
    } catch {
      // If it fails, try verifying as a Firebase ID token
      decoded = (await auth.verifyIdToken(token)) as DecodedTokenPayload;
      isFirebaseToken = true;
    }

    let role = typeof decoded.role === "string" ? decoded.role : undefined;
    const userId = (typeof decoded.userId === "string" ? decoded.userId : undefined) || (typeof decoded.uid === "string" ? decoded.uid : "");
    const platform = (typeof decoded.platform === "string" ? decoded.platform : undefined) || (isFirebaseToken ? "mobile" : "web");

    // If it's a Firebase token and lacks a role in claims, fetch from users/admins
    if (isFirebaseToken && !role) {
      const identity = await findIdentityByIdModel(userId);
      if (identity) {
        role = identity.profile.role || "user";
      } else {
        role = "user";
      }
    }

    const userRole: UserRole =
      role === "admin" || role === "super_admin" || role === "user" ? role : "user";
    const userPlatform: Platform = platform === "mobile" ? "mobile" : "web";

    req.user = {
      userId,
      email: typeof decoded.email === "string" ? decoded.email : "",
      role: userRole,
      platform: userPlatform,
    };

    next();
  } catch (error) {
    console.error("JWT/Firebase Verification Error:", error);
    return next(new UnauthorizedError("Invalid or expired token."));
  }
};

/**
 * Optionally verifies the JWT token from Authorization header.
 * Attaches decoded user to `req.user` if valid, otherwise leaves it undefined.
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    let decoded: DecodedTokenPayload;
    let isFirebaseToken = false;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as DecodedTokenPayload;
    } catch {
      decoded = (await auth.verifyIdToken(token)) as DecodedTokenPayload;
      isFirebaseToken = true;
    }

    let role = typeof decoded.role === "string" ? decoded.role : undefined;
    const userId = (typeof decoded.userId === "string" ? decoded.userId : undefined) || (typeof decoded.uid === "string" ? decoded.uid : "");
    const platform = (typeof decoded.platform === "string" ? decoded.platform : undefined) || (isFirebaseToken ? "mobile" : "web");

    if (isFirebaseToken && !role) {
      try {
        const identity = await findIdentityByIdModel(userId);
        if (identity) {
          role = identity.profile.role || "user";
        } else {
          role = "user";
        }
      } catch {
        role = "user";
      }
    }

    const userRole: UserRole =
      role === "admin" || role === "super_admin" || role === "user" ? role : "user";
    const userPlatform: Platform = platform === "mobile" ? "mobile" : "web";

    req.user = {
      userId,
      email: typeof decoded.email === "string" ? decoded.email : "",
      role: userRole,
      platform: userPlatform,
    };
  } catch {
    // Token invalid or expired; leave req.user undefined for optional auth
  }

  next();
};

/**
 * Generates a JWT token for a user.
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string & { __brand?: never },
  } as jwt.SignOptions);
};
