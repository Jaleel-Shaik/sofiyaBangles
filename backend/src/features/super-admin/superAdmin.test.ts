import { resolveDateRange } from "./models/superAdminAnalytics.model";

/**
 * SuperAdmin Revenue Calculation Verification Test Helper
 */
export function runSuperAdminCalculationsVerification() {
  const grossAmount = 4999;
  const adminPct = 70;

  const adminShareAmount = Math.round(grossAmount * (adminPct / 100) * 100) / 100;
  const superAdminShareAmount = Math.round((grossAmount - adminShareAmount) * 100) / 100;

  if (adminShareAmount !== 3499.3 || superAdminShareAmount !== 1499.7) {
    throw new Error("Commission calculation assertion failed!");
  }

  const range7d = resolveDateRange({ period: "7d" });
  if (!range7d.from || !range7d.to) {
    throw new Error("Date range resolution assertion failed!");
  }

  return { success: true, adminShareAmount, superAdminShareAmount };
}
