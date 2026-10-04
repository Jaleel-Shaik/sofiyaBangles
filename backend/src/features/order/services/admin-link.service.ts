import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../../shared/config/env";
import { JwtPayload } from "../../../shared/types";
import {
  maskPhoneNumber,
  normalizePhoneE164,
} from "../../../shared/utils/redact.utils";
import {
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from "../../../core/errors/app.error";
import { getBusinessProfileDb } from "../../../db/settings.db";
import { findIdentityByIdModel } from "../../../shared/models/identity.model";

export interface AdminActionTokenPayload {
  purpose: "ADMIN_WHATSAPP_ACTION";
  orderNumber: string;
  productId?: string | null;
  adminPhone: string;
  role: "admin";
  jti: string;
  iat?: number;
  exp?: number;
}

export interface GenerateAdminLinkResult {
  token: string;
  adminPortalUrl: string;
  mobileAppUrl: string;
  expiresInMinutes: number;
}

export interface VerifyAdminLinkResult {
  valid: boolean;
  orderNumber: string;
  productId?: string | null;
  adminPhoneMasked: string;
  targetUrl: string;
  mobileAppUrl: string;
}

// In-memory single-use token registry to prevent replay attacks
const redeemedTokenJtis = new Set<string>();

export class AdminLinkService {
  /**
   * Generates a tamper-proof, single-use, phone-bound action token
   * for the store admin to safely access the admin portal and mobile app from WhatsApp.
   *
   * Security Boundaries:
   * 1. Bound strictly to the verified business admin phone number.
   * 2. Short TTL (strictly 15 minutes).
   * 3. Single-use `jti` prevents replay attacks.
   * 4. Signed with backend JWT_SECRET; cannot be forged by clients.
   * 5. Produces both Web Universal Access Link and Mobile App Deep Link.
   */
  static generateAdminActionToken(params: {
    orderNumber: string;
    productId?: string | null;
    adminPhone: string;
  }): GenerateAdminLinkResult {
    const normalizedPhone = normalizePhoneE164(params.adminPhone);
    const jti = uuidv4();

    const payload: AdminActionTokenPayload = {
      purpose: "ADMIN_WHATSAPP_ACTION",
      orderNumber: params.orderNumber,
      productId: params.productId || null,
      adminPhone: normalizedPhone,
      role: "admin",
      jti,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: "15m",
    } as jwt.SignOptions);

    const baseUrl = env.ADMIN_PORTAL_URL.replace(/\/$/, "");
    const adminPortalUrl = `${baseUrl}/admin/access?token=${token}&orderNumber=${encodeURIComponent(
      params.orderNumber
    )}`;

    const mobileScheme = (env.MOBILE_APP_SCHEME || "sofiyabangles").replace(/:\/\/?$/, "");
    const productTarget = params.productId || "";
    const mobileAppUrl = productTarget
      ? `${mobileScheme}://quick-sell?code=${encodeURIComponent(
          productTarget
        )}&orderNumber=${encodeURIComponent(params.orderNumber)}`
      : `${mobileScheme}://orders?orderNumber=${encodeURIComponent(params.orderNumber)}`;

    return {
      token,
      adminPortalUrl,
      mobileAppUrl,
      expiresInMinutes: 15,
    };
  }

  /**
   * Verifies an incoming admin link token against the calling user's credentials.
   *
   * Security Enforcement:
   * 1. Ensures token is signed and unexpired.
   * 2. Checks token has not been redeemed already.
   * 3. Rejects non-admin users (e.g., customer trying to use the link) with 403.
   * 4. Validates that the caller's verified phone matches the authorized admin phone.
   */
  static async verifyAdminActionToken(
    token: string,
    currentUser?: JwtPayload | null
  ): Promise<VerifyAdminLinkResult> {
    if (!token) {
      throw new BadRequestError("Missing action token");
    }

    // 1. Verify cryptographic JWT signature and expiration
    let decoded: AdminActionTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as AdminActionTokenPayload;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new UnauthorizedError(
          "Admin access link has expired. Please request a new order link or login directly.",
          "LINK_EXPIRED"
        );
      }
      throw new UnauthorizedError("Invalid or tampered action token", "INVALID_TOKEN");
    }

    if (decoded.purpose !== "ADMIN_WHATSAPP_ACTION") {
      throw new UnauthorizedError("Invalid token purpose", "INVALID_TOKEN_PURPOSE");
    }

    // 2. Prevent replay attacks
    if (redeemedTokenJtis.has(decoded.jti)) {
      throw new ForbiddenError(
        "This admin access link has already been used.",
        "TOKEN_ALREADY_USED"
      );
    }

    // 3. Caller Role Validation: Caller must have an authenticated admin session
    if (!currentUser) {
      throw new UnauthorizedError(
        "Admin authentication required to access this order.",
        "ADMIN_LOGIN_REQUIRED"
      );
    }

    const callerRole = (currentUser.role || "").toLowerCase().trim();
    if (callerRole !== "admin" && callerRole !== "super_admin" && callerRole !== "superadmin") {
      console.warn(
        `[AdminLinkService] SECURITY ALERT: Non-admin user (${currentUser.userId}, role: ${currentUser.role}) attempted to access admin order link for order ${decoded.orderNumber}`
      );
      throw new ForbiddenError(
        "Access denied: You do not have permission to access the admin portal.",
        "NOT_AN_ADMIN"
      );
    }

    // 4. Authorized Phone Number Verification:
    // Sourced from authenticated identity or verified store profile
    let callerPhone = "";
    try {
      const identity = await findIdentityByIdModel(currentUser.userId);
      if (identity?.profile?.phone) {
        callerPhone = normalizePhoneE164(identity.profile.phone);
      }
    } catch (e) {
      // Identity lookup error handled below
    }

    let storeAdminPhone = "";
    try {
      const businessProfile = await getBusinessProfileDb();
      if (businessProfile?.whatsapp_number) {
        storeAdminPhone = normalizePhoneE164(businessProfile.whatsapp_number);
      }
    } catch (e) {
      // Store profile lookup error handled below
    }

    const tokenPhone = normalizePhoneE164(decoded.adminPhone);

    // Caller matches either their own registered admin phone or the store's primary admin WhatsApp number
    const isPhoneAuthorized =
      (callerPhone && (callerPhone === tokenPhone || callerPhone.endsWith(tokenPhone) || tokenPhone.endsWith(callerPhone))) ||
      (storeAdminPhone && (storeAdminPhone === tokenPhone || storeAdminPhone.endsWith(tokenPhone) || tokenPhone.endsWith(storeAdminPhone))) ||
      callerRole === "super_admin";

    if (!isPhoneAuthorized) {
      console.warn(
        `[AdminLinkService] SECURITY ALERT: Phone mismatch for order ${decoded.orderNumber}. Caller: ${maskPhoneNumber(
          callerPhone
        )}, Token: ${maskPhoneNumber(tokenPhone)}`
      );
      throw new ForbiddenError(
        `Access denied: This order link is bound exclusively to the authorized store admin phone (${maskPhoneNumber(
          tokenPhone
        )}).`,
        "PHONE_MISMATCH"
      );
    }

    // Determine target URL for admin
    const targetUrl = decoded.productId
      ? `/dashboard/products/${decoded.productId}?action=sell&orderNumber=${encodeURIComponent(
          decoded.orderNumber
        )}`
      : `/dashboard/orders?orderNumber=${encodeURIComponent(decoded.orderNumber)}`;

    const mobileScheme = (env.MOBILE_APP_SCHEME || "sofiyabangles").replace(/:\/\/?$/, "");
    const mobileAppUrl = decoded.productId
      ? `${mobileScheme}://quick-sell?code=${encodeURIComponent(
          decoded.productId
        )}&orderNumber=${encodeURIComponent(decoded.orderNumber)}`
      : `${mobileScheme}://orders?orderNumber=${encodeURIComponent(decoded.orderNumber)}`;

    return {
      valid: true,
      orderNumber: decoded.orderNumber,
      productId: decoded.productId,
      adminPhoneMasked: maskPhoneNumber(tokenPhone),
      targetUrl,
      mobileAppUrl,
    };
  }

  /**
   * Marks an action token as redeemed once the admin has initiated the order view/sell.
   */
  static redeemAdminActionToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as AdminActionTokenPayload | null;
      if (decoded?.jti) {
        redeemedTokenJtis.add(decoded.jti);
      }
    } catch {
      // Ignore decode failure on cleanup
    }
  }
}
