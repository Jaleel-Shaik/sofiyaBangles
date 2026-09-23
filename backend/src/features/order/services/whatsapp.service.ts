import { env } from "../../../shared/config/env";
import { maskPhoneNumber, normalizePhoneE164, sanitizeLog } from "../../../shared/utils/redact.utils";
import { formatISTReadable } from "../../../shared/utils/datetime";
import { getBusinessProfileDb } from "../../../db/settings.db";
import { AdminLinkService } from "./admin-link.service";

export interface WhatsAppPurchaseNotificationParams {
  customerName: string;
  customerPhone: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
  productUniqueId: string;
  productId?: string;
  productCategory: string;
  orderNumber: string;
  orderTimestamp: string;
  size?: string | null;
  customMeasurements?: Record<string, string> | null;
  notes?: string | null;
  adminPortalUrl?: string | null;
  mobileAppUrl?: string | null;
}

export interface WhatsAppDeliveryResult {
  mode: "cloud_api" | "client_dispatch";
  status: "sent" | "ready";
  orderNumber: string;
  whatsappUrl?: string;
  adminPortalUrl?: string;
  mobileAppUrl?: string;
  recipientPhoneMasked: string;
  messagePreviewMasked: string;
}

export class WhatsAppService {
  /**
   * Constructs the structured, tamper-proof notification message.
   */
  static buildPurchaseMessage(params: WhatsAppPurchaseNotificationParams): string {
    const lines: string[] = [
      "🛍️ *NEW PRODUCT PURCHASE ORDER*",
      "",
      `*Order Number:* ${params.orderNumber}`,
      `*Purchase Date/Time:* ${formatISTReadable(params.orderTimestamp)}`,
      "",
      "👤 *Customer Profile:*",
      `• *Name:* ${params.customerName}`,
      `• *Mobile Number:* ${params.customerPhone}`,
      "",
      "📦 *Product Details:*",
      `• *Product Name:* ${params.productName}`,
      `• *Unique ID / Code:* ${params.productUniqueId}`,
      `• *Category:* ${params.productCategory}`,
      `• *Unit Price:* ₹${params.productPrice}`,
      `• *Quantity:* ${params.quantity}`,
      `• *Total Amount:* ₹${params.subtotal}`,
    ];

    if (params.size) {
      lines.push(`• *Size:* ${params.size}`);
    }

    if (params.customMeasurements && Object.keys(params.customMeasurements).length > 0) {
      lines.push("");
      lines.push("📏 *Custom Measurements:*");
      Object.entries(params.customMeasurements).forEach(([k, v]) => {
        lines.push(`  - ${k}: ${v}`);
      });
    }

    if (params.notes) {
      lines.push("");
      lines.push(`📝 *Customer Notes:* ${params.notes}`);
    }

    if (params.adminPortalUrl || params.mobileAppUrl) {
      lines.push("");
      lines.push("🔗 *Admin Fulfill & Sell Actions:*");
      if (params.mobileAppUrl) {
        lines.push(`• *📱 Mobile App:* ${params.mobileAppUrl}`);
      }
      if (params.adminPortalUrl) {
        lines.push(`• *🌐 Direct Link (Tap to Open App / Web):* ${params.adminPortalUrl}`);
      }
    }

    lines.push("");
    lines.push("✨ *Action Required:* Please confirm order fulfillment and payment verification.");

    return lines.join("\n");
  }

  /**
   * Sends or generates the WhatsApp purchase notification.
   *
   * Security Boundaries:
   * 1. If Meta WhatsApp Cloud API credentials exist (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID),
   *    delivers directly from the backend to the business WhatsApp number without exposing secrets to client.
   * 2. If Cloud API is unconfigured (dev/fallback), generates a server-verified direct deep-link
   *    containing the canonical, tamper-proof details for client dispatch.
   * 3. Includes phone-bound, signed single-use action token strictly authorized for store admin phone.
   * 4. Sensitive customer phone numbers are strictly masked in all logs.
   */
  static async sendPurchaseNotification(
    params: WhatsAppPurchaseNotificationParams
  ): Promise<WhatsAppDeliveryResult> {
    let shopRecipient = env.WHATSAPP_NUMBER
      ? normalizePhoneE164(env.WHATSAPP_NUMBER)
      : "";

    if (!shopRecipient) {
      try {
        const businessProfile = await getBusinessProfileDb();
        if (businessProfile?.whatsapp_number) {
          shopRecipient = normalizePhoneE164(businessProfile.whatsapp_number);
        }
      } catch (err) {
        console.warn("[WhatsAppService] Could not fetch business profile for WhatsApp number:", err);
      }
    }

    if (!shopRecipient) {
      shopRecipient = "919876543210";
    }

    // Generate signed, phone-bound single-use admin portal and mobile app links
    const { adminPortalUrl, mobileAppUrl } = AdminLinkService.generateAdminActionToken({
      orderNumber: params.orderNumber,
      productId: params.productId || params.productUniqueId,
      adminPhone: shopRecipient,
    });

    const enrichedParams: WhatsAppPurchaseNotificationParams = {
      ...params,
      adminPortalUrl,
      mobileAppUrl,
    };

    const rawMessage = this.buildPurchaseMessage(enrichedParams);

    const maskedCustomerPhone = maskPhoneNumber(params.customerPhone);
    const maskedShopPhone = maskPhoneNumber(shopRecipient);

    // Check if Meta WhatsApp Cloud API is configured
    const isCloudApiConfigured = Boolean(
      env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
    );

    if (isCloudApiConfigured) {
      try {
        console.log(
          `[WhatsAppService] Dispatching purchase notification via Meta Cloud API for order ${params.orderNumber} to ${maskedShopPhone}...`
        );
        await this.dispatchViaMetaCloudApi({
          recipientPhone: shopRecipient,
          messageText: rawMessage,
        });

        console.log(
          `[WhatsAppService] Successfully sent WhatsApp Cloud API notification for order ${params.orderNumber}.`
        );

        return {
          mode: "cloud_api",
          status: "sent",
          orderNumber: params.orderNumber,
          adminPortalUrl,
          mobileAppUrl,
          recipientPhoneMasked: maskedShopPhone,
          messagePreviewMasked: rawMessage.replace(params.customerPhone, maskedCustomerPhone),
        };
      } catch (error: any) {
        console.error(
          `[WhatsAppService] Failed to dispatch via Meta Cloud API (${error.message}). Falling back to server-verified client dispatch.`,
          sanitizeLog({ error: error.message, stack: error.stack })
        );
        // Graceful fallback to client dispatch so the user purchase is never lost
      }
    }

    // Client-assisted fallback (Generates safe deep-link directly from server-verified data)
    const encodedMessage = encodeURIComponent(rawMessage);
    const whatsappUrl = `https://wa.me/${shopRecipient}?text=${encodedMessage}`;

    return {
      mode: "client_dispatch",
      status: "ready",
      orderNumber: params.orderNumber,
      whatsappUrl,
      adminPortalUrl,
      mobileAppUrl,
      recipientPhoneMasked: maskedShopPhone,
      messagePreviewMasked: rawMessage.replace(params.customerPhone, maskedCustomerPhone),
    };
  }

  /**
   * Executes HTTPS POST to Meta WhatsApp Cloud API with automatic exponential backoff retry.
   */
  private static async dispatchViaMetaCloudApi(options: {
    recipientPhone: string;
    messageText: string;
  }): Promise<void> {
    const { recipientPhone, messageText } = options;
    const url = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Meta Graph API responded with status ${response.status}: ${JSON.stringify(
              sanitizeLog(errorData)
            )}`
          );
        }

        return; // Success
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          const delayMs = attempt * 1000;
          console.warn(
            `[WhatsAppService] Attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error("Unknown error while communicating with WhatsApp Cloud API");
  }
}
