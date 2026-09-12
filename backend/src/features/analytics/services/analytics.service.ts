import { fetchAnalyticsRawCollectionsDb } from "../../../db/analytics.db";
import { OverviewAnalytics, ProductsByCategory, AnalyticsQueryFilters } from "../../../models/analytics.model";

export const getOverviewAnalyticsService = async (
  filters?: AnalyticsQueryFilters
): Promise<OverviewAnalytics> => {
  const {
    products,
    categories,
    orders,
    users,
    productVariants,
    orderItems,
    soldAuditLogs,
    totalFavoritesCount,
  } = await fetchAnalyticsRawCollectionsDb();

  // Exclude soft-deleted products
  let allProducts = products.filter((p: any) => p.is_deleted !== true);

  if (filters?.category_id) {
    allProducts = allProducts.filter((p) => p.category_id === filters.category_id);
  }

  if (filters?.model_type_id) {
    allProducts = allProducts.filter((p) => p.model_type_id === filters.model_type_id);
  }

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter((p) => p.is_active !== false && p.status !== "archived").length;

  let totalStock = 0;
  let itemsSold = 0;

  const validProductIds = new Set(allProducts.map((p) => p.id));

  // Sum stock across products and variants
  for (const p of allProducts) {
    let productStock = 0;

    let parsedVariants: any[] = [];
    if (p.variants) {
      if (Array.isArray(p.variants)) {
        parsedVariants = p.variants;
      } else if (typeof p.variants === "string") {
        try {
          parsedVariants = JSON.parse(p.variants);
        } catch {
          parsedVariants = [];
        }
      }
    }

    if (p.has_variants && parsedVariants.length > 0) {
      parsedVariants.forEach((v) => {
        productStock += Number(v.quantity) || 0;
      });
    } else if (p.has_variants) {
      const dbVariants = productVariants.filter((v) => v.product_id === p.id);
      if (dbVariants.length > 0) {
        dbVariants.forEach((v) => {
          productStock += v.quantity;
        });
      } else {
        productStock = Number(p.quantity) || 0;
      }
    } else {
      productStock = Number(p.quantity) || 0;
    }

    totalStock += productStock;

    if ((p as any).total_sales) {
      itemsSold += Number((p as any).total_sales) || 0;
    }
  }

  // Calculate sold items from order_items
  orderItems.forEach((item) => {
    if (item.product_id && validProductIds.has(item.product_id)) {
      itemsSold += item.quantity || 0;
    }
  });

  // Calculate sold items from audit_logs (manual stock sales)
  soldAuditLogs.forEach((log) => {
    if (log.record_id && validProductIds.has(log.record_id)) {
      const oldQty = (log.old_data as { quantity?: number })?.quantity ?? 0;
      const newQty = (log.new_data as { quantity?: number })?.quantity ?? 0;
      const diff = oldQty - newQty;
      if (diff > 0 && !log.from_order) {
        itemsSold += diff;
      }
    }
  });

  const activeCategoriesCount = categories.filter((c) => c.is_active !== false).length;

  return {
    activeProducts,
    totalProducts,
    totalCategories: activeCategoriesCount,
    totalUsers: users.length,
    totalFavorites: totalFavoritesCount,
    totalOrders: orders.length,
    totalStock,
    itemsSold,
  };
};

export const getProductsByCategoryService = async (): Promise<ProductsByCategory[]> => {
  const { products, categories } = await fetchAnalyticsRawCollectionsDb();

  const activeCategories = categories.filter((c) => c.is_active !== false);
  const activeProducts = products.filter((p) => p.is_active !== false);

  const categoryCounts = new Map<string, { name: string; count: number }>();

  activeCategories.forEach((cat) => {
    categoryCounts.set(cat.id, { name: cat.category_name, count: 0 });
  });

  activeProducts.forEach((p) => {
    if (p.category_id && categoryCounts.has(p.category_id)) {
      const cat = categoryCounts.get(p.category_id)!;
      cat.count += 1;
    }
  });

  const result: ProductsByCategory[] = Array.from(categoryCounts.values()).map((c) => ({
    category_name: c.name,
    count: c.count,
  }));

  result.sort((a, b) => b.count - a.count);
  return result;
};

export const getRecentSignupsService = async (
  days: number = 30
): Promise<{ date: string; count: number }[]> => {
  const { users } = await fetchAnalyticsRawCollectionsDb();

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const countsByDate = new Map<string, number>();

  users.forEach((u) => {
    if (u.created_at) {
      const userDate = new Date(u.created_at);
      if (userDate >= dateLimit) {
        const dateStr = userDate.toISOString().split("T")[0];
        countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
      }
    }
  });

  const result = Array.from(countsByDate.entries()).map(([date, count]) => ({ date, count }));
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
};
