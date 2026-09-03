import { db } from "../../../shared/config/firebase";
import { OverviewAnalytics, ProductsByCategory } from "../../../shared/types";

export const getOverviewAnalyticsModel = async (filters?: {
  category_id?: string;
  model_type_id?: string;
}): Promise<OverviewAnalytics> => {
  let productsSnapshot = await db.collection("products").get();
  let allProducts = productsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));

  // Exclude soft deleted products
  allProducts = allProducts.filter(p => p.is_deleted !== true);

  // Filter by category_id if specified
  if (filters?.category_id) {
    allProducts = allProducts.filter(p => p.category_id === filters.category_id);
  }

  // Filter by model_type_id if specified
  if (filters?.model_type_id) {
    allProducts = allProducts.filter(p => p.model_type_id === filters.model_type_id);
  }

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.is_active !== false && p.status !== "archived").length;

  let totalStock = 0;
  let itemsSold = 0;

  const validProductIds = new Set(allProducts.map(p => p.id));

  // Sum stock across products and variants
  for (const p of allProducts) {
    let productStock = 0;
    
    // Parse variants if present on product document directly
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
      parsedVariants.forEach(v => {
        productStock += (Number(v.quantity) || 0);
      });
    } else if (p.has_variants) {
      try {
        const variantsSnap = await db.collection("product_variants").where("product_id", "==", p.id).get();
        if (!variantsSnap.empty) {
          variantsSnap.forEach(vDoc => {
            productStock += (Number(vDoc.data().quantity) || 0);
          });
        } else {
          productStock = (Number(p.quantity) || 0);
        }
      } catch {
        productStock = (Number(p.quantity) || 0);
      }
    } else {
      productStock = (Number(p.quantity) || 0);
    }

    totalStock += productStock;

    if (p.total_sales) {
      itemsSold += (Number(p.total_sales) || 0);
    }
  }

  console.log(`📊 Analytics Overview Calculated: Total Products = ${totalProducts}, Total Stock = ${totalStock}, Items Sold = ${itemsSold} (Filters: category=${filters?.category_id || "ALL"}, model=${filters?.model_type_id || "ALL"})`);

  // Calculate sold items from order_items
  try {
    const orderItemsSnapshot = await db.collection("order_items").get();
    orderItemsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.product_id && validProductIds.has(data.product_id)) {
        itemsSold += (Number(data.quantity) || 0);
      }
    });
  } catch (e) {
    console.error("Failed to calculate items sold from order_items", e);
  }

  // Calculate sold items from audit_logs
  try {
    const auditSnapshot = await db.collection("audit_logs")
      .where("action", "==", "PRODUCT_SOLD")
      .get();
    auditSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.record_id && validProductIds.has(data.record_id)) {
        const oldQty = (data.old_data as { quantity?: number })?.quantity ?? 0;
        const newQty = (data.new_data as { quantity?: number })?.quantity ?? 0;
        const diff = oldQty - newQty;
        if (diff > 0 && !data.from_order) {
          itemsSold += diff;
        }
      }
    });
  } catch (e) {
    console.error("Failed to calculate items sold from audit_logs", e);
  }

  const [totalCategories, totalUsers, totalFavorites, totalOrders] = await Promise.all([
    db.collection("categories").where("is_active", "==", true).count().get(),
    db.collection("users").count().get(),
    db.collection("favorites").count().get(),
    db.collection("orders").count().get()
  ]);

  return {
    activeProducts,
    totalProducts,
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
