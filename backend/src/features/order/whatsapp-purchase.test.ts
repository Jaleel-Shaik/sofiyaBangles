import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "../../app";
import {
  maskPhoneNumber,
  maskEmail,
  normalizePhoneE164,
  sanitizeLog,
} from "../../shared/utils/redact.utils";
import { WhatsAppService } from "./services/whatsapp.service";
import { AdminLinkService } from "./services/admin-link.service";
import { whatsappPurchaseSchema } from "./validations/order.validation";

describe("Secure Product-Purchase & WhatsApp Flow Suite", () => {
  describe("PII Redaction & Log Masking Utilities", () => {
    it("masks Indian mobile numbers correctly", () => {
      assert.strictEqual(maskPhoneNumber("+919876543210"), "+91 98****3210");
      assert.strictEqual(maskPhoneNumber("9876543210"), "98****3210");
      assert.strictEqual(maskPhoneNumber(""), "[REDACTED]");
      assert.strictEqual(maskPhoneNumber(null), "[REDACTED]");
    });

    it("masks email addresses correctly", () => {
      assert.strictEqual(maskEmail("fatima.begum@example.com"), "f***m@example.com");
      assert.strictEqual(maskEmail("ab@cd.com"), "a***@cd.com");
      assert.strictEqual(maskEmail(null), "[REDACTED]");
    });

    it("standardizes mobile numbers to E.164 without non-digits", () => {
      assert.strictEqual(normalizePhoneE164("+91 98765-43210"), "919876543210");
      assert.strictEqual(normalizePhoneE164("9876543210"), "919876543210");
    });

    it("deeply sanitizes log objects, masking passwords, tokens, and phone numbers", () => {
      const rawPayload = {
        customerName: "Ayesha Khan",
        customerPhone: "+919876543210",
        authToken: "super_secret_jwt_token_12345",
        password: "user_password_xyz",
        product: {
          id: "prod-123",
          price: 1500,
        },
      };

      const sanitized = sanitizeLog(rawPayload);

      assert.strictEqual(sanitized.customerName, "Ayesha Khan");
      assert.strictEqual(sanitized.customerPhone, "+91 98****3210");
      assert.strictEqual(sanitized.authToken, "[REDACTED_CREDENTIAL]");
      assert.strictEqual(sanitized.password, "[REDACTED_CREDENTIAL]");
      assert.strictEqual(sanitized.product.price, 1500);
    });
  });

  describe("WhatsApp Message Payload Construction", () => {
    it("formats message containing all required user profile and product fields without product image", () => {
      const message = WhatsAppService.buildPurchaseMessage({
        customerName: "Fatima Begum",
        customerPhone: "+919876543210",
        productName: "Bridal Kundan Chooda Set",
        productPrice: 2499,
        quantity: 2,
        subtotal: 4998,
        productUniqueId: "SOF-BG-001",
        productCategory: "Bridal Sets",
        orderNumber: "ORD-123456",
        orderTimestamp: "2026-09-22T10:30:00.000Z",
        size: "2.6",
      });

      // Assert that all required profile and product fields are present
      assert.ok(message.includes("Fatima Begum"), "Contains User Name");
      assert.ok(message.includes("+919876543210"), "Contains User Mobile Number");
      assert.ok(message.includes("Bridal Kundan Chooda Set"), "Contains Product Name");
      assert.ok(message.includes("2499"), "Contains Product Price");
      assert.ok(message.includes("4998"), "Contains Subtotal");
      assert.ok(message.includes("SOF-BG-001"), "Contains Unique Product ID");
      assert.ok(message.includes("Bridal Sets"), "Contains Product Category");
      assert.ok(message.includes("ORD-123456"), "Contains Order Number");
      assert.ok(message.includes("*Size:* 2.6"), "Contains Size");

      // Assert product image is strictly excluded
      assert.strictEqual(message.includes("Product Image"), false, "Must not contain Product Image header");
      assert.strictEqual(message.includes("http"), false, "Must not contain image URLs");
    });
  });

  describe("WhatsApp Purchase Input Validation", () => {
    it("accepts valid input with productId and quantity", () => {
      const result = whatsappPurchaseSchema.safeParse({
        productId: "prod-999",
        quantity: 2,
        size: "2.4",
      });
      assert.strictEqual(result.success, true);
    });

    it("rejects request if productId is missing", () => {
      const result = whatsappPurchaseSchema.safeParse({
        quantity: 1,
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe("Phone-Bound Admin WhatsApp Action Token Security", () => {
    it("generates a signed single-use action token bound to the authorized admin phone", () => {
      const result = AdminLinkService.generateAdminActionToken({
        orderNumber: "ORD-889900",
        productId: "prod-bangle-1",
        adminPhone: "+91 98765 43210",
      });

      assert.ok(result.token, "Generates JWT token");
      assert.strictEqual(result.expiresInMinutes, 15, "Enforces 15-minute TTL");
      assert.ok(result.adminPortalUrl.includes("/admin/access?token="), "Builds portal access link");
      assert.ok(result.adminPortalUrl.includes("orderNumber=ORD-889900"), "Includes order number");
      assert.ok(result.mobileAppUrl.startsWith("sofiyabangles://quick-sell"), "Builds mobile app deep link");
    });

    it("strictly blocks customer role (user) from accessing admin action link", async () => {
      const { token } = AdminLinkService.generateAdminActionToken({
        orderNumber: "ORD-889900",
        adminPhone: "919876543210",
      });

      // Customer trying to use the admin link
      const customerSession = {
        userId: "cust-123",
        email: "customer@example.com",
        role: "user" as any,
      };

      await assert.rejects(
        async () => {
          await AdminLinkService.verifyAdminActionToken(token, customerSession);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.code, "NOT_AN_ADMIN");
          return true;
        }
      );
    });

    it("rejects token verification when caller is unauthenticated", async () => {
      const { token } = AdminLinkService.generateAdminActionToken({
        orderNumber: "ORD-889900",
        adminPhone: "919876543210",
      });

      await assert.rejects(
        async () => {
          await AdminLinkService.verifyAdminActionToken(token, null);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 401);
          assert.strictEqual(err.code, "ADMIN_LOGIN_REQUIRED");
          return true;
        }
      );
    });

    it("successfully validates for authorized admin whose phone matches", async () => {
      const { token } = AdminLinkService.generateAdminActionToken({
        orderNumber: "ORD-889900",
        productId: "prod-456",
        adminPhone: "919876543210",
      });

      // Super admin or store admin session
      const adminSession = {
        userId: "admin-super-1",
        email: "admin@sofiyabangles.com",
        role: "super_admin" as any,
      };

      const verification = await AdminLinkService.verifyAdminActionToken(token, adminSession);
      assert.strictEqual(verification.valid, true);
      assert.strictEqual(verification.orderNumber, "ORD-889900");
      assert.strictEqual(verification.productId, "prod-456");
      assert.ok(verification.targetUrl.includes("action=sell"), "Directs to sell action");
      assert.ok(verification.mobileAppUrl.startsWith("sofiyabangles://quick-sell"), "Returns mobile app deep link");
    });

    it("prevents replay attacks by invalidating redeemed tokens", async () => {
      const { token } = AdminLinkService.generateAdminActionToken({
        orderNumber: "ORD-999111",
        adminPhone: "919876543210",
      });

      const adminSession = {
        userId: "admin-super-1",
        email: "admin@sofiyabangles.com",
        role: "super_admin" as any,
      };

      // First verification succeeds
      const first = await AdminLinkService.verifyAdminActionToken(token, adminSession);
      assert.strictEqual(first.valid, true);

      // Redeem token
      AdminLinkService.redeemAdminActionToken(token);

      // Second attempt with redeemed token is blocked
      await assert.rejects(
        async () => {
          await AdminLinkService.verifyAdminActionToken(token, adminSession);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.code, "TOKEN_ALREADY_USED");
          return true;
        }
      );
    });
  });

  describe("WhatsApp Purchase Security Boundary Endpoints", () => {
    let server: http.Server;
    let baseUrl: string;

    it("starts server for endpoint verification", async () => {
      server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address() as { port: number };
      baseUrl = `http://localhost:${address.port}`;
    });

    it("rejects unauthenticated POST /api/orders/whatsapp-purchase with 401", async () => {
      const res = await fetch(`${baseUrl}/api/orders/whatsapp-purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: "prod-123",
          quantity: 1,
        }),
      });

      assert.strictEqual(res.status, 401);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, false);
    });

    it("stops server", async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
  });
});
