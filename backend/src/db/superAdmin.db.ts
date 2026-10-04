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
  userId?: string,
  role?: string
): Promise<Notification[]> => {
  const snapshot = await db.collection("notifications").get();
  const rawNotifs = snapshot.docs.map((doc) => ({ ...(doc.data() as Notification), id: doc.id }));

  const isSuperAdmin = role === "super_admin";

  const filtered = rawNotifs.filter((n) => {
    // 1. Exclude notifications dismissed by this specific user
    if (userId && Array.isArray(n.dismissed_by) && n.dismissed_by.includes(userId)) {
      return false;
    }

    // 2. Strict Super-Admin only check:
    // If targeted at all_superadmins, only super_admin can see it
    if (n.user_id === "all_superadmins" && !isSuperAdmin) {
      return false;
    }
    const typeUpper = (n.type || "").toUpperCase();
    if (
      (typeUpper === "AUDIT_ALERT" ||
        typeUpper === "SECURITY_ALERT" ||
        typeUpper === "SYSTEM_SECURITY" ||
        typeUpper === "ROLE_CHANGE" ||
        typeUpper === "2FA_RESET") &&
      !isSuperAdmin
    ) {
      return false;
    }

    // 3. User target checks:
    const matchesTarget =
      !n.user_id ||
      n.user_id === null ||
      n.user_id === "all" ||
      n.user_id === "all_admins" ||
      (isSuperAdmin && n.user_id === "all_superadmins") ||
      (userId && n.user_id === userId);

    return matchesTarget;
  });
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Strict deduplication
  const dedupeMap = new Map<string, Notification>();
  for (const notif of filtered) {
    const key = notif.product_id
      ? `${notif.type || "stock"}:${notif.product_id}`
      : `${notif.type || "msg"}:${(notif.title || "").trim().toLowerCase()}:${(notif.body || "").trim().toLowerCase()}`;

    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, notif);
    }
  }

  const result = Array.from(dedupeMap.values());
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Enrich notifications with order_number and product_id if missing
  result.forEach((n) => {
    if (!n.order_number) {
      const match = (n.title?.match(/ORD-[\w\d-]+/i)?.[0] || n.body?.match(/ORD-[\w\d-]+/i)?.[0])?.replace(/^#/, "");
      if (match) {
        n.order_number = match;
      }
    }
  });

  // Attempt to resolve missing product_ids and missing images
  const productsWithoutImages = result.slice(0, 30).filter((n) => n.product_id && !n.image_url);
  const notificationsMissingProductId = result
    .slice(0, 30)
    .filter(
      (n) =>
        !n.product_id &&
        (n.type?.includes("arrival") ||
          n.type?.includes("stock") ||
          n.title?.includes("Arrival") ||
          n.title?.includes("Stock"))
    );

  if (productsWithoutImages.length > 0 || notificationsMissingProductId.length > 0) {
    try {
      // 1. Fetch products missing image
      if (productsWithoutImages.length > 0) {
        const missingProductIds = Array.from(new Set(productsWithoutImages.map((n) => n.product_id!)));
        const productDocs = await Promise.all(
          missingProductIds.map((pid) => db.collection("products").doc(pid).get())
        );
        const productImagesMap = new Map<string, string>();
        productDocs.forEach((doc) => {
          if (doc.exists) {
            const img = doc.data()?.image_url;
            if (img) productImagesMap.set(doc.id, img);
          }
        });

        result.forEach((n) => {
          if (n.product_id && !n.image_url && productImagesMap.has(n.product_id)) {
            n.image_url = productImagesMap.get(n.product_id);
          }
        });
      }

      // 2. Fetch products to resolve missing product_id by product_name
      if (notificationsMissingProductId.length > 0) {
        const prodSnap = await db.collection("products").limit(50).get();
        const allProducts = prodSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
        notificationsMissingProductId.forEach((n) => {
          const title = (n.title || "").toLowerCase();
          const body = (n.body || "").toLowerCase();
          const match = allProducts.find((p: any) => {
            const pName = (p.product_name || "").toLowerCase().trim();
            return pName && (title.includes(pName) || body.includes(`"${pName}"`) || body.includes(pName));
          });
          if (match) {
            n.product_id = match.id;
            if (!n.image_url && (match as any).image_url) {
              n.image_url = (match as any).image_url;
            }
          }
        });
      }
    } catch {}
  }

  return result;
};

/**
 * Pure Database Operation: Mark notification as read.
 */
export const markNotificationReadDb = async (notificationId: string): Promise<void> => {
  await db.collection("notifications").doc(notificationId).update({
    is_read: true,
  });
};
