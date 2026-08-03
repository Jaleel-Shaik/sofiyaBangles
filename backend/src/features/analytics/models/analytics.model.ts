import { db } from "../../../shared/config/firebase";
import { OverviewAnalytics, ProductsByCategory } from "../../../shared/types";

export const getOverviewAnalyticsModel = async (): Promise<OverviewAnalytics> => {
  const activeProductsQuery = db.collection("products").where("is_active", "==", true).count().get();
  const totalProductsQuery = db.collection("products").count().get();
  const totalCategoriesQuery = db.collection("categories").where("is_active", "==", true).count().get();
  const totalUsersQuery = db.collection("users").count().get();
  const totalFavoritesQuery = db.collection("favorites").count().get();
  const totalOrdersQuery = db.collection("orders").count().get();

  const [activeProducts, totalProducts, totalCategories, totalUsers, totalFavorites, totalOrders] = await Promise.all([
    activeProductsQuery,
    totalProductsQuery,
    totalCategoriesQuery,
    totalUsersQuery,
    totalFavoritesQuery,
    totalOrdersQuery
  ]);

  let totalStock = 0;
  let itemsSold = 0;
  try {
    const productsSnapshot = await db.collection("products").where("is_active", "==", true).get();
    productsSnapshot.forEach(doc => {
      const data = doc.data();
      totalStock += data.quantity || 0;
    });
  } catch (e) {
    console.error("Failed to calculate total stock", e);
  }

  try {
    const auditSnapshot = await db.collection("audit_logs")
      .where("action", "==", "PRODUCT_SOLD")
      .get();
    auditSnapshot.forEach(doc => {
      const data = doc.data();
      const oldQty = (data.old_data as { quantity?: number })?.quantity ?? 0;
      const newQty = (data.new_data as { quantity?: number })?.quantity ?? 0;
      itemsSold += oldQty - newQty;
    });
  } catch (e) {
    console.error("Failed to calculate items sold", e);
  }

  return {
    activeProducts: activeProducts.data().count,
    totalProducts: totalProducts.data().count,
    totalCategories: totalCategories.data().count,
    totalUsers: totalUsers.data().count,
    totalFavorites: totalFavorites.data().count,
    totalOrders: totalOrders.data().count,
    totalStock,
    itemsSold
  };
};

export const getProductsByCategoryModel = async (): Promise<ProductsByCategory[]> => {
  const categoriesSnapshot = await db.collection("categories").where("is_active", "==", true).get();
  const productsSnapshot = await db.collection("products").where("is_active", "==", true).get();

  const categoryCounts = new Map<string, { name: string; count: number }>();

  categoriesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    categoryCounts.set(doc.id, { name: data.category_name, count: 0 });
  });

  productsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.category_id && categoryCounts.has(data.category_id)) {
      const cat = categoryCounts.get(data.category_id)!;
      cat.count += 1;
    }
  });

  const result: ProductsByCategory[] = Array.from(categoryCounts.values()).map(c => ({
    category_name: c.name,
    count: c.count
  }));

  result.sort((a, b) => b.count - a.count);
  return result;
};

export const getRecentSignupsModel = async (
  days: number = 30,
): Promise<{ date: string; count: number }[]> => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const snapshot = await db.collection("users")
    .where("created_at", ">=", dateLimit.toISOString())
    .get();

  const countsByDate = new Map<string, number>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.created_at) {
      // Extract YYYY-MM-DD
      const dateStr = new Date(data.created_at).toISOString().split('T')[0];
      countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
    }
  });

  const result = Array.from(countsByDate.entries()).map(([date, count]) => ({ date, count }));
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
};
