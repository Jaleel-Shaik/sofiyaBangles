import { db } from "../../../shared/config/firebase";
import {
  Product,
  Order,
  OrderItem,
  RevenueLedgerItem,
  SuperAdminDashboardData,
  ProductAnalyticsDetail,
  SalesAnalyticsQuery,
  AuditLog,
  Notification,
} from "../../../shared/types";
import { getPlatformCommissionSettingsModel } from "../../order/models/revenueLedger.model";
import { getProductByIdModel } from "../../product/models/product.model";

/**
 * Calculates date range boundaries based on preset period or explicit from/to dates.
 */
export function resolveDateRange(query: SalesAnalyticsQuery): { from: Date; to: Date } {
  const now = new Date();
  let to = new Date(now);
  let from = new Date(now);

  if (query.fromDate) {
    from = new Date(query.fromDate);
  }
  if (query.toDate) {
    to = new Date(query.toDate);
  }

  if (!query.fromDate && query.period) {
    switch (query.period) {
      case "today":
        from.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case "7d":
        from.setDate(from.getDate() - 7);
        break;
      case "30d":
        from.setDate(from.getDate() - 30);
        break;
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_year":
        from = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        from.setDate(from.getDate() - 30);
    }
  } else if (!query.fromDate) {
    // Default to last 30 days
    from.setDate(from.getDate() - 30);
  }

  return { from, to };
}

/**
 * Main SuperAdmin Dashboard Aggregator
 */
export const getSuperAdminDashboardData = async (
  query: SalesAnalyticsQuery
): Promise<SuperAdminDashboardData> => {
  const { from, to } = resolveDateRange(query);
  const fromTime = from.getTime();
  const toTime = to.getTime();

  // 1. Fetch Commission Settings
  const commission = await getPlatformCommissionSettingsModel();

  // 2. Fetch Products
  const productsSnap = await db.collection("products").get();
  const allProducts = productsSnap.docs.map((doc) => doc.data() as Product);
  
  let filteredProducts = allProducts;
  if (query.categoryId) {
    filteredProducts = filteredProducts.filter((p) => p.category_id === query.categoryId);
  }
  if (query.modelTypeId) {
    filteredProducts = filteredProducts.filter((p) => p.model_type_id === query.modelTypeId);
  }

  const totalProducts = filteredProducts.length;
  const activeProducts = filteredProducts.filter((p) => p.is_active !== false && p.status !== "archived").length;
  const lowStockCount = filteredProducts.filter((p) => (p.quantity || 0) > 0 && (p.quantity || 0) <= 10).length;
  const outOfStockCount = filteredProducts.filter((p) => (p.quantity || 0) === 0).length;

  // 3. Fetch Orders
  const ordersSnap = await db.collection("orders").get();
  const allOrders = ordersSnap.docs.map((doc) => doc.data() as Order);
  
  const pendingOrders = allOrders.filter(
    (o) => o.status === "pending" || o.status === "processing" || o.status === "confirmed"
  ).length;

  // 4. Fetch Revenue Ledger
  const ledgerSnap = await db.collection("revenue_ledger").get();
  let allLedger = ledgerSnap.docs.map((doc) => doc.data() as RevenueLedgerItem);

  if (query.adminId) {
    allLedger = allLedger.filter((l) => l.admin_id === query.adminId);
  }

  // Filter ledger records by date range
  const periodLedger = allLedger.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= fromTime && t <= toTime;
  });

  const saleLedger = periodLedger.filter((l) => l.transaction_type === "SALE");
  const refundLedger = periodLedger.filter((l) => l.transaction_type === "REFUND");

  const grossSales = saleLedger.reduce((sum, l) => sum + (l.gross_amount || 0), 0);
  const totalRefunds = Math.abs(refundLedger.reduce((sum, l) => sum + (l.gross_amount || 0), 0));
  const netSales = grossSales - totalRefunds;

  const adminEarnings = periodLedger.reduce((sum, l) => sum + (l.admin_share_amount || 0), 0);
  const superAdminEarnings = periodLedger.reduce((sum, l) => sum + (l.super_admin_share_amount || 0), 0);

  // Fetch Order Items for unit counts and product breakdown
  const orderItemsSnap = await db.collection("order_items").get();
  const allOrderItems = orderItemsSnap.docs.map((doc) => doc.data() as OrderItem);

  // Map order item IDs from sale ledger
  const saleItemIds = new Set(saleLedger.map((l) => l.order_item_id));
  const soldItems = allOrderItems.filter((item) => saleItemIds.has(item.id));

  const distinctSoldProducts = new Set(soldItems.map((item) => item.product_id));
  const productsSold = distinctSoldProducts.size;
  const unitsSold = soldItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // 5. Sales Trend Aggregation (Grouping by day YYYY-MM-DD)
  const trendMap = new Map<
    string,
    { grossSales: number; adminEarnings: number; superAdminEarnings: number; unitsSold: number; orderCount: number; orderIds: Set<string> }
  >();

  periodLedger.forEach((l) => {
    const day = l.created_at.split("T")[0];
    if (!trendMap.has(day)) {
      trendMap.set(day, {
        grossSales: 0,
        adminEarnings: 0,
        superAdminEarnings: 0,
        unitsSold: 0,
        orderCount: 0,
        orderIds: new Set<string>(),
      });
    }
    const entry = trendMap.get(day)!;
    if (l.transaction_type === "SALE") {
      entry.grossSales += l.gross_amount;
    } else if (l.transaction_type === "REFUND") {
      entry.grossSales += l.gross_amount; // negative value
    }
    entry.adminEarnings += l.admin_share_amount;
    entry.superAdminEarnings += l.super_admin_share_amount;
    if (l.order_id) entry.orderIds.add(l.order_id);
  });

  // Add units sold to trendMap
  soldItems.forEach((item) => {
    const day = item.created_at ? item.created_at.split("T")[0] : "";
    if (day && trendMap.has(day)) {
      trendMap.get(day)!.unitsSold += item.quantity || 0;
    }
  });

  const salesTrend = Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      grossSales: Math.round(data.grossSales * 100) / 100,
      adminEarnings: Math.round(data.adminEarnings * 100) / 100,
      superAdminEarnings: Math.round(data.superAdminEarnings * 100) / 100,
      unitsSold: data.unitsSold,
      orderCount: data.orderIds.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 6. Top Selling Products
  const productPerformanceMap = new Map<
    string,
    { product_id: string; product_name: string; category_name: string; image_url: string | null; units_sold: number; gross_revenue: number; super_admin_share: number; stock: number }
  >();

  soldItems.forEach((item) => {
    const p = allProducts.find((prod) => prod.id === item.product_id);
    const ledgerForProduct = periodLedger.filter((l) => l.order_item_id === item.id);
    const gross = ledgerForProduct.reduce((sum, l) => sum + l.gross_amount, 0);
    const saShare = ledgerForProduct.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

    if (!productPerformanceMap.has(item.product_id)) {
      productPerformanceMap.set(item.product_id, {
        product_id: item.product_id,
        product_name: item.product_name_snapshot || (p ? p.product_name : "Unknown"),
        category_name: item.category_name_snapshot || (p ? p.category_name || "General" : "General"),
        image_url: p ? p.image_url : null,
        units_sold: 0,
        gross_revenue: 0,
        super_admin_share: 0,
        stock: p ? p.quantity : 0,
      });
    }

    const perf = productPerformanceMap.get(item.product_id)!;
    perf.units_sold += item.quantity || 0;
    perf.gross_revenue += gross;
    perf.super_admin_share += saShare;
  });

  const topSellingProducts = Array.from(productPerformanceMap.values())
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 10);

  // 7. Category Performance
  const categoryMap = new Map<
    string,
    { category_id: string; category_name: string; units_sold: number; gross_revenue: number; super_admin_share: number }
  >();

  soldItems.forEach((item) => {
    const catId = item.category_id || "uncategorized";
    const catName = item.category_name_snapshot || "General";
    const ledgerForProduct = periodLedger.filter((l) => l.order_item_id === item.id);
    const gross = ledgerForProduct.reduce((sum, l) => sum + l.gross_amount, 0);
    const saShare = ledgerForProduct.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        category_id: catId,
        category_name: catName,
        units_sold: 0,
        gross_revenue: 0,
        super_admin_share: 0,
      });
    }

    const cat = categoryMap.get(catId)!;
    cat.units_sold += item.quantity || 0;
    cat.gross_revenue += gross;
    cat.super_admin_share += saShare;
  });

  const categoryPerformance = Array.from(categoryMap.values()).sort(
    (a, b) => b.gross_revenue - a.gross_revenue
  );

  // 8. Recent Sales Orders (10 most recent)
  const recentOrders = allOrders
    .filter((o) => o.status === "completed" || o.payment_status === "paid" || o.payment_status === "refunded")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const recentSales = await Promise.all(
    recentOrders.map(async (o) => {
      const orderLedger = allLedger.filter((l) => l.order_id === o.id);
      const super_admin_share = orderLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);
      const admin_share = orderLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
      const itemsForOrder = allOrderItems.filter((i) => i.order_id === o.id);

      let customer_name = "Customer";
      if (o.shipping_address_snapshot && o.shipping_address_snapshot.name) {
        customer_name = o.shipping_address_snapshot.name;
      }

      return {
        order_id: o.id,
        order_number: o.order_number,
        customer_name,
        created_at: o.created_at,
        items_count: itemsForOrder.length,
        total_amount: o.total_amount,
        super_admin_share,
        admin_share,
        status: o.status,
      };
    })
  );

  // 9. Recent Activity (10 most recent audit logs)
  const auditSnap = await db.collection("audit_logs").get();
  const allLogs = auditSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));

  allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentActivityLogs = allLogs.slice(0, 10);

  const recentActivity = recentActivityLogs.map((log) => ({
    id: log.id,
    actor_id: log.actor_id,
    actor_name: log.user_type === "admin" ? "Admin" : log.user_type === "super_admin" ? "Super Admin" : "System",
    action: log.action,
    details: `${log.action} on ${log.table_name || "system"} (${log.record_id || ""})`,
    created_at: log.created_at,
  }));

  return {
    kpis: {
      totalProducts,
      activeProducts,
      productsSold,
      unitsSold,
      grossSales: Math.round(grossSales * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      adminEarnings: Math.round(adminEarnings * 100) / 100,
      superAdminEarnings: Math.round(superAdminEarnings * 100) / 100,
      pendingOrders,
      lowStockCount,
      outOfStockCount,
    },
    commission,
    salesTrend,
    topSellingProducts,
    categoryPerformance,
    recentSales,
    recentActivity,
  };
};

/**
 * Detailed Analytics for a single Product (Product Drilldown)
 */
export const getProductAnalyticsDetailModel = async (
  productId: string
): Promise<ProductAnalyticsDetail> => {
  const product = await getProductByIdModel(productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  // Fetch Order Items for this product
  const itemsSnap = await db
    .collection("order_items")
    .where("product_id", "==", productId)
    .get();
  const items = itemsSnap.docs.map((doc) => doc.data() as OrderItem);

  // Fetch Revenue Ledger for this product
  const ledgerSnap = await db
    .collection("revenue_ledger")
    .where("product_id", "==", productId)
    .get();
  const ledger = ledgerSnap.docs.map((doc) => doc.data() as RevenueLedgerItem);

  const completedLedger = ledger.filter((l) => l.status === "completed" || l.transaction_type === "SALE");
  const units_sold = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const orders_count = new Set(items.map((i) => i.order_id)).size;
  const gross_revenue = completedLedger.reduce((sum, l) => sum + l.gross_amount, 0);
  const admin_share = completedLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
  const super_admin_share = completedLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

  const saleDates = items.map((i) => new Date(i.created_at).getTime()).filter(Boolean);
  saleDates.sort((a, b) => a - b);
  const first_sale_date = saleDates.length > 0 ? new Date(saleDates[0]).toISOString() : null;
  const last_sale_date = saleDates.length > 0 ? new Date(saleDates[saleDates.length - 1]).toISOString() : null;

  // Sales History timeline
  const ordersSnap = await db.collection("orders").get();
  const allOrders = ordersSnap.docs.map((doc) => doc.data() as Order);

  const salesHistory = items.map((i) => {
    const order = allOrders.find((o) => o.id === i.order_id);
    const itemLedger = ledger.filter((l) => l.order_item_id === i.id && l.transaction_type === "SALE");
    const aShare = itemLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
    const saShare = itemLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

    return {
      order_id: i.order_id,
      order_number: order ? order.order_number : `ORD-${i.order_id.slice(0, 6)}`,
      sale_date: i.created_at,
      quantity: i.quantity,
      unit_price: i.price_snapshot,
      total_amount: i.subtotal || i.price_snapshot * i.quantity,
      admin_share: aShare,
      super_admin_share: saShare,
    };
  }).sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

  // Stock History timeline from audit logs
  const auditSnap = await db
    .collection("audit_logs")
    .where("record_id", "==", productId)
    .get();
  const auditLogs = auditSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));

  const stockHistory = auditLogs
    .filter((log) => log.action === "STOCK_UPDATED" || log.action === "PRODUCT_SOLD" || log.action === "PRODUCT_CREATED")
    .map((log) => {
      const oldQty = (log.old_data as any)?.quantity || 0;
      const newQty = (log.new_data as any)?.quantity || 0;
      return {
        id: log.id,
        action: log.action,
        quantity_change: newQty - oldQty,
        new_quantity: newQty,
        actor_id: log.actor_id,
        created_at: log.created_at,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    product,
    metrics: {
      units_sold,
      orders_count,
      gross_revenue: Math.round(gross_revenue * 100) / 100,
      admin_share: Math.round(admin_share * 100) / 100,
      super_admin_share: Math.round(super_admin_share * 100) / 100,
      first_sale_date,
      last_sale_date,
      current_stock: product.quantity,
    },
    salesHistory,
    stockHistory,
  };
};

/**
 * Get Audit Logs / Admin Activity Timeline
 */
export const getAdminActivityModel = async (options: {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
}): Promise<{ items: (AuditLog & { actor_name?: string; actor_email?: string; actor_role?: string })[]; total: number }> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));

  let query: FirebaseFirestore.Query = db.collection("audit_logs");
  if (options.actorId) {
    query = query.where("actor_id", "==", options.actorId);
  }
  if (options.action) {
    query = query.where("action", "==", options.action);
  }

  const snapshot = await query.get();
  let logs = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));

  // Strictly filter to product operations only — exclude login/logout/auth telemetry
  const PRODUCT_ACTIONS = new Set([
    "PRODUCT_CREATED",
    "PRODUCT_UPDATED",
    "PRODUCT_DELETED",
    "STOCK_UPDATED",
    "PRODUCT_SOLD",
    "PRODUCT_RESTORED",
  ]);

  logs = logs.filter(
    (log) =>
      PRODUCT_ACTIONS.has(log.action) ||
      log.table_name === "products" ||
      (log.action && (log.action.startsWith("PRODUCT_") || log.action.startsWith("STOCK_")))
  );

  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = logs.length;
  const offset = (page - 1) * limit;
  const paginatedLogs = logs.slice(offset, offset + limit);

  // Fetch actor details in parallel
  const { findIdentityByIdModel } = require("../../../shared/models/identity.model");
  const enrichedLogs = await Promise.all(
    paginatedLogs.map(async (log) => {
      let actor_name = undefined;
      let actor_email = undefined;
      let actor_role = undefined;
      if (log.actor_id) {
        try {
          const identity = await findIdentityByIdModel(log.actor_id);
          if (identity) {
            actor_name = identity.profile.full_name;
            actor_email = identity.profile.email;
            actor_role = identity.profile.role;
          }
        } catch {}
      }
      return {
        ...log,
        actor_name: actor_name || "Admin Staff",
        actor_email: actor_email || undefined,
        actor_role: actor_role || (log.user_type === "super_admin" ? "super_admin" : "admin"),
      };
    })
  );

  return { items: enrichedLogs, total };
};

/**
 * Get SuperAdmin Notifications
 */
export const getSuperAdminNotificationsModel = async (
  userId?: string
): Promise<Notification[]> => {
  const snapshot = await db.collection("notifications").get();
  const notifs = snapshot.docs.map((doc) => doc.data() as Notification);

  // Filter for super_admin (user_id === null or user_id === userId)
  const filtered = notifs.filter((n) => n.user_id === null || n.user_id === userId);
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Mark notification as read
 */
export const markNotificationReadModel = async (notificationId: string): Promise<void> => {
  await db.collection("notifications").doc(notificationId).update({
    is_read: true,
  });
};
