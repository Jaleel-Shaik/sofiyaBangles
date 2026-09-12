import {
  SalesAnalyticsQuery,
  RevenueTransactionType,
  SuperAdminDashboardData,
  ProductAnalyticsDetail,
  AuditLog,
  Notification,
  PlatformCommissionSettings,
  RevenueLedgerItem,
  OrderItem,
  Order,
  Product,
} from "../../../shared/types";
import { SalesTrendDataPoint } from "../../../models/superAdmin.model";
import {
  fetchSuperAdminRawCollectionsDb,
  fetchProductAnalyticsRawDataDb,
  getSuperAdminNotificationsDb,
  markNotificationReadDb,
} from "../../../db/superAdmin.db";
import { queryAuditLogsDb, insertAuditLogDb } from "../../../db/audit.db";
import { resolveDateRange } from "../models/superAdminAnalytics.model";
import {
  queryRevenueLedgerDb,
  getPlatformCommissionSettingsDb,
  setPlatformCommissionSettingsDb,
} from "../../../db/revenueLedger.db";
import { getAllAdminOrdersDb, getOrderByIdDb, getOrderItemsDb } from "../../../db/order.db";
import { getAdminProductsService } from "../../product/services/product.service";
import { findIdentityByIdDb } from "../../../db/auth.db";

export class SuperAdminService {
  /**
   * SuperAdmin Dashboard Overview & Aggregated Business KPIs
   */
  static async getDashboard(query: SalesAnalyticsQuery): Promise<SuperAdminDashboardData> {
    const { from, to } = resolveDateRange(query);
    const fromTime = from.getTime();
    const toTime = to.getTime();

    // 1. Fetch raw data from pure Data Access Layer
    const { commission, products, orders, revenueLedger, orderItems, auditLogs } =
      await fetchSuperAdminRawCollectionsDb();

    // 2. Filter Products
    let filteredProducts = products;
    if (query.categoryId) {
      filteredProducts = filteredProducts.filter((p: Product) => p.category_id === query.categoryId);
    }
    if (query.modelTypeId) {
      filteredProducts = filteredProducts.filter((p: Product) => p.model_type_id === query.modelTypeId);
    }

    const totalProducts = filteredProducts.length;
    const activeProducts = filteredProducts.filter((p: Product) => p.is_active !== false && p.status !== "archived").length;
    const lowStockCount = filteredProducts.filter((p: Product) => (p.quantity || 0) > 0 && (p.quantity || 0) <= 10).length;
    const outOfStockCount = filteredProducts.filter((p: Product) => (p.quantity || 0) === 0).length;

    // 3. Order Status Filtering
    const pendingOrders = orders.filter(
      (o: Order) => o.status === "pending" || o.status === "processing" || o.status === "confirmed"
    ).length;

    // 4. Revenue Ledger Domain Math
    const allLedger = revenueLedger;
    const periodLedger = allLedger.filter((l: RevenueLedgerItem) => {
      const t = new Date(l.created_at).getTime();
      return t >= fromTime && t <= toTime;
    });

    const saleEntries = periodLedger.filter((l: RevenueLedgerItem) => l.transaction_type === "SALE" && l.status === "completed");
    const refundEntries = periodLedger.filter((l: RevenueLedgerItem) => l.transaction_type === "REFUND" || l.transaction_type === "REVERSAL");

    const grossSales = saleEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + l.gross_amount, 0);
    const totalRefunds = refundEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + Math.abs(l.gross_amount), 0);
    const netSales = grossSales - totalRefunds;

    const adminEarnings =
      saleEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0) -
      refundEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + Math.abs(l.admin_share_amount), 0);

    const superAdminEarnings =
      saleEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0) -
      refundEntries.reduce((sum: number, l: RevenueLedgerItem) => sum + Math.abs(l.super_admin_share_amount), 0);

    // Units and Products sold
    const soldOrderItemIds = new Set(saleEntries.map((l: RevenueLedgerItem) => l.order_item_id).filter(Boolean));
    const soldItems = orderItems.filter((i: OrderItem) => soldOrderItemIds.has(i.id));
    const unitsSold = soldItems.reduce((sum: number, i: OrderItem) => sum + (i.quantity || 0), 0);
    const productsSold = new Set(soldItems.map((i: OrderItem) => i.product_id)).size;

    // 5. Sales Trend Bucket Calculation
    const intervalDays = Math.max(1, Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)));
    const trendBuckets = new Map<string, { date: string; gross_sales: number; net_sales: number; super_admin_share: number; admin_share: number; orders_count: number }>();

    for (let i = 0; i <= intervalDays; i++) {
      const d = new Date(fromTime + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      if (!trendBuckets.has(key)) {
        trendBuckets.set(key, {
          date: key,
          gross_sales: 0,
          net_sales: 0,
          super_admin_share: 0,
          admin_share: 0,
          orders_count: 0,
        });
      }
    }

    periodLedger.forEach((l: RevenueLedgerItem) => {
      const key = l.created_at ? l.created_at.split("T")[0] : "";
      if (trendBuckets.has(key)) {
        const b = trendBuckets.get(key)!;
        if (l.transaction_type === "SALE" && l.status === "completed") {
          b.gross_sales += l.gross_amount;
          b.net_sales += l.gross_amount;
          b.super_admin_share += l.super_admin_share_amount;
          b.admin_share += l.admin_share_amount;
        } else if (l.transaction_type === "REFUND" || l.transaction_type === "REVERSAL") {
          b.net_sales -= Math.abs(l.gross_amount);
          b.super_admin_share -= Math.abs(l.super_admin_share_amount);
          b.admin_share -= Math.abs(l.admin_share_amount);
        }
      }
    });

    orders.forEach((o: Order) => {
      const t = new Date(o.created_at).getTime();
      if (t >= fromTime && t <= toTime) {
        const key = o.created_at ? o.created_at.split("T")[0] : "";
        if (trendBuckets.has(key)) {
          trendBuckets.get(key)!.orders_count += 1;
        }
      }
    });

    const salesTrend: SalesTrendDataPoint[] = Array.from(trendBuckets.values())
      .map((b) => ({
        date: b.date,
        grossSales: b.gross_sales,
        adminEarnings: b.admin_share,
        superAdminEarnings: b.super_admin_share,
        unitsSold: 0,
        orderCount: b.orders_count,
        gross_sales: b.gross_sales,
        net_sales: b.net_sales,
        super_admin_share: b.super_admin_share,
        admin_share: b.admin_share,
        orders_count: b.orders_count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Top Selling Products
    const productPerformanceMap = new Map<
      string,
      { product_id: string; product_name: string; category_name: string; image_url: string | null; units_sold: number; gross_revenue: number; super_admin_share: number; stock: number }
    >();

    soldItems.forEach((item: OrderItem) => {
      const p = products.find((pr: Product) => pr.id === item.product_id);
      const ledgerForProduct = periodLedger.filter((l: RevenueLedgerItem) => l.order_item_id === item.id);
      const gross = ledgerForProduct.reduce((sum: number, l: RevenueLedgerItem) => sum + l.gross_amount, 0);
      const saShare = ledgerForProduct.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

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

    soldItems.forEach((item: OrderItem) => {
      const catId = item.category_id || "uncategorized";
      const catName = item.category_name_snapshot || "General";
      const ledgerForProduct = periodLedger.filter((l: RevenueLedgerItem) => l.order_item_id === item.id);
      const gross = ledgerForProduct.reduce((sum: number, l: RevenueLedgerItem) => sum + l.gross_amount, 0);
      const saShare = ledgerForProduct.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

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
    const recentOrders = orders
      .filter((o: Order) => o.status === "completed" || o.payment_status === "paid" || o.payment_status === "refunded")
      .sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    const recentSales = recentOrders.map((o: Order) => {
      const orderLedger = allLedger.filter((l: RevenueLedgerItem) => l.order_id === o.id);
      const super_admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);
      const admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
      const itemsForOrder = orderItems.filter((i: OrderItem) => i.order_id === o.id);

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
    });

    // 9. Recent Activity (10 most recent audit logs)
    const sortedLogs = [...auditLogs].sort(
      (a: AuditLog, b: AuditLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recentActivityLogs = sortedLogs.slice(0, 10);

    const recentActivity = recentActivityLogs.map((log: AuditLog) => ({
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
  }

  /**
   * Paginated Sales List with computed commission splits
   */
  static async getSalesList(params: { page: number; limit: number; status?: string; search?: string }) {
    const result = await getAllAdminOrdersDb(params);
    const ledgerSnap = await queryRevenueLedgerDb({ limit: 1000 });

    const ordersWithCommissions = await Promise.all(
      result.orders.map(async (order: Order) => {
        const items = await getOrderItemsDb(order.id);
        const orderLedger = ledgerSnap.items.filter((l: RevenueLedgerItem) => l.order_id === order.id);
        const admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
        const super_admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

        return {
          ...order,
          items,
          admin_share: Math.round(admin_share * 100) / 100,
          super_admin_share: Math.round(super_admin_share * 100) / 100,
        };
      })
    );

    return {
      orders: ordersWithCommissions,
      total: result.total,
    };
  }

  /**
   * Order Details with Revenue Split Breakdown
   */
  static async getSaleDetail(id: string) {
    const order = await getOrderByIdDb(id);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const items = await getOrderItemsDb(id);
    const ledgerSnap = await queryRevenueLedgerDb({ limit: 1000 });
    const orderLedger = ledgerSnap.items.filter((l: RevenueLedgerItem) => l.order_id === id);

    const admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
    const super_admin_share = orderLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

    return {
      ...order,
      items,
      ledger: orderLedger,
      admin_share: Math.round(admin_share * 100) / 100,
      super_admin_share: Math.round(super_admin_share * 100) / 100,
    };
  }

  /**
   * Product-level Revenue Analytics
   */
  static async getProductsAnalytics(params: { page: number; limit: number }) {
    const productsResult = await getAdminProductsService(params);
    const ledgerSnap = await queryRevenueLedgerDb({ limit: 1000 });

    const analyticsProducts = productsResult.products.map((p: Product) => {
      const pLedger = ledgerSnap.items.filter((l: RevenueLedgerItem) => l.product_id === p.id);
      const gross_revenue = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + (l.gross_amount || 0), 0);
      const admin_share = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + (l.admin_share_amount || 0), 0);
      const super_admin_share = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + (l.super_admin_share_amount || 0), 0);

      return {
        ...p,
        gross_revenue: Math.round(gross_revenue * 100) / 100,
        admin_share: Math.round(admin_share * 100) / 100,
        super_admin_share: Math.round(super_admin_share * 100) / 100,
      };
    });

    return {
      products: analyticsProducts,
      total: productsResult.total,
    };
  }

  /**
   * Detailed Product Analytics Drilldown (Metrics, Sales Timeline, Stock Changes)
   */
  static async getProductAnalyticsDetail(productId: string): Promise<ProductAnalyticsDetail> {
    const { product, items, ledger, orders, auditLogs } =
      await fetchProductAnalyticsRawDataDb(productId);

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const completedLedger = ledger.filter((l: RevenueLedgerItem) => l.status === "completed" || l.transaction_type === "SALE");
    const units_sold = items.reduce((sum: number, i: OrderItem) => sum + (i.quantity || 0), 0);
    const orders_count = new Set(items.map((i: OrderItem) => i.order_id)).size;
    const gross_revenue = completedLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.gross_amount, 0);
    const admin_share = completedLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
    const super_admin_share = completedLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

    const saleDates = items.map((i: OrderItem) => (i.created_at ? new Date(i.created_at).getTime() : 0)).filter(Boolean);
    saleDates.sort((a: number, b: number) => a - b);
    const first_sale_date = saleDates.length > 0 ? new Date(saleDates[0]).toISOString() : null;
    const last_sale_date = saleDates.length > 0 ? new Date(saleDates[saleDates.length - 1]).toISOString() : null;

    // Sales History timeline
    const salesHistory = items
      .map((i: OrderItem) => {
        const order = orders.find((o: Order) => o.id === i.order_id);
        const itemLedger = ledger.filter((l: RevenueLedgerItem) => l.order_item_id === i.id && l.transaction_type === "SALE");
        const aShare = itemLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
        const saShare = itemLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

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
      })
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

    // Stock History timeline from audit logs
    const stockHistory = auditLogs
      .filter((log: AuditLog) => log.action === "STOCK_UPDATED" || log.action === "PRODUCT_SOLD" || log.action === "PRODUCT_CREATED")
      .map((log: AuditLog) => {
        const oldQty = typeof log.old_data?.quantity === "number" ? log.old_data.quantity : 0;
        const newQty = typeof log.new_data?.quantity === "number" ? log.new_data.quantity : 0;
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
  }

  /**
   * Paginated and Filtered Audit Activity Log with Actor Enrichment
   */
  static async getAdminActivity(options: {
    page?: number;
    limit?: number;
    actorId?: string;
    action?: string;
  }): Promise<{ items: (AuditLog & { actor_name?: string; actor_email?: string; actor_role?: string })[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const rawLogs = await queryAuditLogsDb(options.actorId, options.action);

    const PRODUCT_ACTIONS = new Set([
      "PRODUCT_CREATED",
      "PRODUCT_UPDATED",
      "PRODUCT_DELETED",
      "STOCK_UPDATED",
      "PRODUCT_SOLD",
      "PRODUCT_RESTORED",
    ]);

    const filteredLogs = rawLogs.filter(
      (log: AuditLog) =>
        PRODUCT_ACTIONS.has(log.action) ||
        log.table_name === "products" ||
        (log.action && (log.action.startsWith("PRODUCT_") || log.action.startsWith("STOCK_")))
    );

    filteredLogs.sort((a: AuditLog, b: AuditLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filteredLogs.length;
    const offset = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log: AuditLog) => {
        let actor_name: string | undefined = undefined;
        let actor_email: string | undefined = undefined;
        let actor_role: string | undefined = undefined;
        if (log.actor_id) {
          try {
            const identity = await findIdentityByIdDb(log.actor_id);
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
  }

  /**
   * Paginated Revenue Ledger Records
   */
  static async getRevenueLedger(params: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    transactionType?: RevenueTransactionType;
    adminId?: string;
  }) {
    return await queryRevenueLedgerDb(params);
  }

  /**
   * Commission Settings Management
   */
  static async getCommissionSettings(): Promise<PlatformCommissionSettings> {
    return await getPlatformCommissionSettingsDb();
  }

  static async updateCommissionSettings(adminPct: number, superAdminPct: number, actorId: string): Promise<PlatformCommissionSettings> {
    const updated = await setPlatformCommissionSettingsDb(adminPct, superAdminPct, actorId);

    await insertAuditLogDb({
      actor_id: actorId,
      action: "COMMISSION_SETTINGS_UPDATED",
      table_name: "platform_settings",
      record_id: "commission",
      new_data: { admin_percentage: adminPct, super_admin_percentage: superAdminPct },
    });

    return updated;
  }

  /**
   * SuperAdmin Notifications
   */
  static async getNotifications(userId?: string): Promise<Notification[]> {
    return await getSuperAdminNotificationsDb(userId);
  }

  static async markNotificationRead(notificationId: string): Promise<void> {
    await markNotificationReadDb(notificationId);
  }

  /**
   * CSV Data Export Utilities
   */
  static async getSalesCsvData(): Promise<string> {
    const result = await getAllAdminOrdersDb({ limit: 1000 });
    const ledgerSnap = await queryRevenueLedgerDb({ limit: 1000 });

    let csv = "Order Number,Date,Status,Total Amount,Admin Share (70%),SuperAdmin Share (30%)\n";
    result.orders.forEach((o: Order) => {
      const oLedger = ledgerSnap.items.filter((l: RevenueLedgerItem) => l.order_id === o.id);
      const aShare = oLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
      const saShare = oLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

      csv += `"${o.order_number}","${o.created_at}","${o.status}",${o.total_amount},${aShare},${saShare}\n`;
    });
    return csv;
  }

  static async getRevenueCsvData(): Promise<string> {
    const result = await queryRevenueLedgerDb({ limit: 1000 });
    let csv = "Ledger ID,Order ID,Product ID,Admin ID,Gross Amount,Admin Share,SuperAdmin Share,Transaction Type,Status,Created At\n";
    result.items.forEach((l: RevenueLedgerItem) => {
      csv += `"${l.id}","${l.order_id}","${l.product_id}","${l.admin_id}",${l.gross_amount},${l.admin_share_amount},${l.super_admin_share_amount},"${l.transaction_type}","${l.status}","${l.created_at}"\n`;
    });
    return csv;
  }

  static async getProductsCsvData(): Promise<string> {
    const result = await getAdminProductsService({ page: 1, limit: 1000 });
    const ledgerSnap = await queryRevenueLedgerDb({ limit: 1000 });

    let csv = "Product Code,Name,Price,Stock,Gross Revenue,Admin Share,SuperAdmin Share,Status\n";
    result.products.forEach((p: Product) => {
      const pLedger = ledgerSnap.items.filter((l: RevenueLedgerItem) => l.product_id === p.id);
      const gross = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.gross_amount, 0);
      const aShare = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.admin_share_amount, 0);
      const saShare = pLedger.reduce((sum: number, l: RevenueLedgerItem) => sum + l.super_admin_share_amount, 0);

      csv += `"${p.unique_code}","${p.product_name}",${p.price},${p.quantity},${gross},${aShare},${saShare},"${p.status}"\n`;
    });
    return csv;
  }
}
