import { db } from "../shared/config/firebase";
import {
  Product,
  Order,
  OrderItem,
  RevenueLedgerItem,
  AuditLog,
  Notification,
  PlatformCommissionSettings,
} from "../shared/types";
import { getPlatformCommissionSettingsDb } from "./revenueLedger.db";
import { getProductByIdDb } from "./product.db";

/**
 * Pure Database Operation: Fetch all raw collections needed for SuperAdmin analytics dashboard.
 */
export const fetchSuperAdminRawCollectionsDb = async (): Promise<{
  commission: PlatformCommissionSettings;
  products: Product[];
  orders: Order[];
  revenueLedger: RevenueLedgerItem[];
  orderItems: OrderItem[];
  auditLogs: AuditLog[];
}> => {
  const [commission, productsSnap, ordersSnap, ledgerSnap, orderItemsSnap, auditSnap] =
    await Promise.all([
      getPlatformCommissionSettingsDb(),
      db.collection("products").get(),
      db.collection("orders").get(),
      db.collection("revenue_ledger").get(),
      db.collection("order_items").get(),
      db.collection("audit_logs").get(),
    ]);

  return {
    commission,
    products: productsSnap.docs.map((d) => d.data() as Product),
    orders: ordersSnap.docs.map((d) => d.data() as Order),
    revenueLedger: ledgerSnap.docs.map((d) => d.data() as RevenueLedgerItem),
    orderItems: orderItemsSnap.docs.map((d) => d.data() as OrderItem),
    auditLogs: auditSnap.docs.map((d) => ({ ...d.data(), id: d.id } as AuditLog)),
  };
};

/**
 * Pure Database Operation: Fetch raw documents for product drilldown analytics.
 */
export const fetchProductAnalyticsRawDataDb = async (
  productId: string
): Promise<{
  product: Product | null;
  items: OrderItem[];
  ledger: RevenueLedgerItem[];
  orders: Order[];
  auditLogs: AuditLog[];
}> => {
  const [product, itemsSnap, ledgerSnap, ordersSnap, auditSnap] = await Promise.all([
    getProductByIdDb(productId),
    db.collection("order_items").where("product_id", "==", productId).get(),
    db.collection("revenue_ledger").where("product_id", "==", productId).get(),
    db.collection("orders").get(),
    db.collection("audit_logs").where("record_id", "==", productId).get(),
  ]);

  return {
    product,
    items: itemsSnap.docs.map((d) => d.data() as OrderItem),
    ledger: ledgerSnap.docs.map((d) => d.data() as RevenueLedgerItem),
    orders: ordersSnap.docs.map((d) => d.data() as Order),
    auditLogs: auditSnap.docs.map((d) => ({ ...d.data(), id: d.id } as AuditLog)),
  };
};

/**
 * Pure Database Operation: Fetch SuperAdmin notifications.
 */
export const getSuperAdminNotificationsDb = async (
  userId?: string
): Promise<Notification[]> => {
  const snapshot = await db.collection("notifications").get();
  const notifs = snapshot.docs.map((doc) => doc.data() as Notification);

  return notifs
    .filter((n) => n.user_id === null || n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Pure Database Operation: Mark notification as read.
 */
export const markNotificationReadDb = async (notificationId: string): Promise<void> => {
  await db.collection("notifications").doc(notificationId).update({
    is_read: true,
  });
};
