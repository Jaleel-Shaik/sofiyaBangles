import { db } from "../shared/config/firebase";
import { Product, Category, Order, OrderItem, Profile } from "../shared/types";

export interface AnalyticsRawCollections {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: Profile[];
  productVariants: Array<{ id: string; product_id: string; quantity: number }>;
  orderItems: Array<{ id: string; product_id: string; quantity: number }>;
  soldAuditLogs: Array<{ id: string; record_id?: string; old_data?: any; new_data?: any; from_order?: boolean }>;
  totalFavoritesCount: number;
}

/**
 * Pure Database Operation: Fetches raw snapshot documents for analytics processing.
 */
export const fetchAnalyticsRawCollectionsDb = async (): Promise<AnalyticsRawCollections> => {
  const [
    productsSnap,
    categoriesSnap,
    ordersSnap,
    usersSnap,
    variantsSnap,
    orderItemsSnap,
    auditLogsSnap,
    favoritesCountSnap,
  ] = await Promise.all([
    db.collection("products").get(),
    db.collection("categories").get(),
    db.collection("orders").get(),
    db.collection("users").get(),
    db.collection("product_variants").get(),
    db.collection("order_items").get(),
    db.collection("audit_logs").where("action", "==", "PRODUCT_SOLD").get(),
    db.collection("favorites").count().get(),
  ]);

  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile));
  const productVariants = variantsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      product_id: data.product_id,
      quantity: Number(data.quantity) || 0,
    };
  });
  const orderItems = orderItemsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      product_id: data.product_id,
      quantity: Number(data.quantity) || 0,
    };
  });
  const soldAuditLogs = auditLogsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      record_id: data.record_id,
      old_data: data.old_data,
      new_data: data.new_data,
      from_order: data.from_order,
    };
  });

  return {
    products,
    categories,
    orders,
    users,
    productVariants,
    orderItems,
    soldAuditLogs,
    totalFavoritesCount: favoritesCountSnap.data().count,
  };
};
