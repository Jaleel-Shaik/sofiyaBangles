/**
 * Pure Model Layer: AuditLog Entity and Action Constraints.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export interface AuditLog {
  id: string;
  actor_id: string;
  user_type?: "customer" | "admin" | "super_admin" | "system";
  action: string;
  table_name?: string;
  record_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const AUDIT_ACTIONS = {
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",
  PRODUCT_RESTORED: "PRODUCT_RESTORED",
  PRODUCT_SOLD: "PRODUCT_SOLD",
  STOCK_UPDATED: "STOCK_UPDATED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  CATEGORY_DELETED: "CATEGORY_DELETED",
  COMMISSION_SETTINGS_UPDATED: "COMMISSION_SETTINGS_UPDATED",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_STATUS_UPDATED: "ORDER_STATUS_UPDATED",
  ORDER_REFUNDED: "ORDER_REFUNDED",
} as const;
