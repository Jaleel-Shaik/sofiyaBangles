/**
 * Pure Model Layer: Revenue Ledger Entity, Commission Settings, and Constraints.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export type RevenueTransactionType = "SALE" | "REFUND" | "PAYOUT" | "ADJUSTMENT";
export type RevenueLedgerStatus = "pending" | "completed" | "reversed" | "failed";

export interface PlatformCommissionSettings {
  admin_percentage: number;
  super_admin_percentage: number;
  updated_at: string;
  updated_by?: string;
}

export interface RevenueLedgerItem {
  id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  admin_id: string;
  gross_amount: number;
  admin_share_percentage: number;
  super_admin_share_percentage: number;
  admin_share_amount: number;
  super_admin_share_amount: number;
  transaction_type: RevenueTransactionType;
  status: RevenueLedgerStatus;
  currency: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Domain Constraints for Platform Commission
 */
export const COMMISSION_CONSTRAINTS = {
  TOTAL_PERCENTAGE: 100,
  DEFAULT_ADMIN_PERCENTAGE: 70,
  DEFAULT_SUPER_ADMIN_PERCENTAGE: 30,
};

export const validateCommissionSplit = (
  adminPct: number,
  superAdminPct: number
): boolean => {
  return (
    adminPct >= 0 &&
    superAdminPct >= 0 &&
    adminPct + superAdminPct === COMMISSION_CONSTRAINTS.TOTAL_PERCENTAGE
  );
};
