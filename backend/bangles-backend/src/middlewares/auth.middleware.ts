import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, JwtPayload } from "../types";

import { auth, db } from "../config/firebase";

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
    res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid token.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    let decoded: any;
    let isFirebaseToken = false;

    try {
      // Try verifying as an Express custom JWT first
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      // If it fails, try verifying as a Firebase ID token
      decoded = await auth.verifyIdToken(token);
      isFirebaseToken = true;
    }

    let role = decoded.role;
    let userId = decoded.userId || decoded.uid;

    // If it's a Firebase token and lacks a role in claims, fetch from Firestore
    if (isFirebaseToken && !role) {
      const profileDoc = await db.collection("profiles").doc(userId).get();
      if (profileDoc.exists) {
        role = profileDoc.data()?.role || "user";
      } else {
        role = "user";
      }
    }

    req.user = {
      userId,
      email: decoded.email,
      role: role,
    };

    next();
  } catch (error) {
    console.error("JWT/Firebase Verification Error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
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
    let decoded: any;
    let isFirebaseToken = false;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      decoded = await auth.verifyIdToken(token);
      isFirebaseToken = true;
    }

    let role = decoded.role;
    let userId = decoded.userId || decoded.uid;

    if (isFirebaseToken && !role) {
      try {
        const profileDoc = await db.collection("profiles").doc(userId).get();
        if (profileDoc.exists) {
          role = profileDoc.data()?.role || "user";
        } else {
          role = "user";
        }
      } catch (e) {
        role = "user";
      }
    }

    req.user = {
      userId,
      email: decoded.email,
      role: role,
    };
  } catch (error) {
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
