import { env } from "../../shared/config/env";
import { ISmsProvider } from "./sms.interface";

export class TwilioSmsAdapter implements ISmsProvider {
  private client: any = null;

  constructor() {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require("twilio");
        this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      } catch (e) {
        console.warn("⚠️ Twilio library failed to initialize:", e);
      }
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    const formattedNumber = to.startsWith("+") ? to : `+91${to}`;

    if (this.client && env.TWILIO_PHONE_NUMBER) {
      try {
        await this.client.messages.create({
          body: message,
          from: env.TWILIO_PHONE_NUMBER,
          to: formattedNumber,
        });
        console.log(`✅ SMS successfully dispatched to ${formattedNumber}`);
        return true;
      } catch (smsError: any) {
        console.error("❌ Failed to send SMS via Twilio:", smsError?.message || smsError);
        return false;
      }
    } else {
      console.log(`⚠️ Twilio SMS unconfigured. Dev-mode fallback dispatch to: ${formattedNumber}`);
      console.log(`💬 Message: ${message}`);
      return true;
    }
  }
}

export const smsProvider = new TwilioSmsAdapter();
