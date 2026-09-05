import { db } from "../../../shared/config/firebase";
import { RevenueLedgerItem, PlatformCommissionSettings, RevenueTransactionType } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_COMMISSION_SETTINGS: PlatformCommissionSettings = {
  admin_percentage: 70,
  super_admin_percentage: 30,
  updated_at: new Date().toISOString(),
  updated_by: "system",
};

/**
 * Get platform commission settings from platform_settings/commission.
 * Falls back to 70/30 default if not configured.
 */
export const getPlatformCommissionSettingsModel = async (): Promise<PlatformCommissionSettings> => {
  try {
    const doc = await db.collection("platform_settings").doc("commission").get();
    if (doc.exists) {
      const data = doc.data() as PlatformCommissionSettings;
      return {
        admin_percentage: data.admin_percentage ?? 70,
        super_admin_percentage: data.super_admin_percentage ?? 30,
        updated_at: data.updated_at || new Date().toISOString(),
        updated_by: data.updated_by || "system",
      };
    }
  } catch (error) {
    console.warn("Failed to fetch commission settings, using default 70/30:", error);
  }
  return DEFAULT_COMMISSION_SETTINGS;
};

/**
 * Update platform commission settings. Validates sum equals 100.
 */
export const updatePlatformCommissionSettingsModel = async (
  adminPct: number,
  superAdminPct: number,
  actorId: string
): Promise<PlatformCommissionSettings> => {
  if (adminPct + superAdminPct !== 100 || adminPct < 0 || superAdminPct < 0) {
    throw new Error("INVALID_COMMISSION_PERCENTAGE");
  }

  const settings: PlatformCommissionSettings = {
    admin_percentage: adminPct,
    super_admin_percentage: superAdminPct,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  };

  await db.collection("platform_settings").doc("commission").set(settings);
  return settings;
};

/**
 * Creates atomic revenue allocation ledger entries for an order item.
 * Idempotent: if transaction of same type exists for (order_id, order_item_id), returns existing.
 */
export const createRevenueAllocationModel = async (input: {
  orderId: string;
  orderItemId: string;
  productId: string;
  adminId?: string;
  grossAmount: number;
  transactionType?: RevenueTransactionType;
  notes?: string;
}): Promise<RevenueLedgerItem> => {
  const transactionType = input.transactionType || "SALE";

  // Idempotency check: see if ledger record already exists
  const existingSnap = await db
    .collection("revenue_ledger")
    .where("order_id", "==", input.orderId)
    .where("order_item_id", "==", input.orderItemId)
    .where("transaction_type", "==", transactionType)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as RevenueLedgerItem;
  }

  // Fetch product creator if adminId not provided
  let adminId = input.adminId;
  if (!adminId) {
    const pDoc = await db.collection("products").doc(input.productId).get();
    if (pDoc.exists) {
      adminId = pDoc.data()?.created_by || "system";
    } else {
      adminId = "system";
    }
  }

  const commission = await getPlatformCommissionSettingsModel();
  const adminPct = commission.admin_percentage;
  const superAdminPct = commission.super_admin_percentage;

  // Rounding precision logic: adminShare = Math.round(grossAmount * (adminPct / 100))
  // superAdminShare = grossAmount - adminShare (ensures exact cent match with no penny leak)
  const adminShareAmount = Math.round(input.grossAmount * (adminPct / 100) * 100) / 100;
  const superAdminShareAmount = Math.round((input.grossAmount - adminShareAmount) * 100) / 100;

  const now = new Date().toISOString();
  const ledgerItem: RevenueLedgerItem = {
    id: uuidv4(),
    order_id: input.orderId,
    order_item_id: input.orderItemId,
    product_id: input.productId,
    admin_id: adminId || "system",
    gross_amount: input.grossAmount,
    admin_share_percentage: adminPct,
    super_admin_share_percentage: superAdminPct,
    admin_share_amount: adminShareAmount,
    super_admin_share_amount: superAdminShareAmount,
    transaction_type: transactionType,
    status: "completed",
    currency: "INR",
    notes: input.notes || null,
    created_at: now,
    updated_at: now,
  };

  await db.collection("revenue_ledger").doc(ledgerItem.id).set(ledgerItem);
  return ledgerItem;
};

/**
 * Reverses revenue allocation when an order is refunded.
 * Creates negative ledger entries and updates original SALE records to status = 'reversed'.
 */
export const createRefundReversalModel = async (
  orderId: string,
  reason?: string
): Promise<RevenueLedgerItem[]> => {
  const existingSalesSnap = await db
    .collection("revenue_ledger")
    .where("order_id", "==", orderId)
    .where("transaction_type", "==", "SALE")
    .get();

  if (existingSalesSnap.empty) {
    return [];
  }

  const batch = db.batch();
  const now = new Date().toISOString();
  const refundItems: RevenueLedgerItem[] = [];

  for (const doc of existingSalesSnap.docs) {
    const sale = doc.data() as RevenueLedgerItem;

    // Check if REFUND record already created for this item (idempotency)
    const refundSnap = await db
      .collection("revenue_ledger")
      .where("order_id", "==", orderId)
      .where("order_item_id", "==", sale.order_item_id)
      .where("transaction_type", "==", "REFUND")
      .limit(1)
      .get();

    if (!refundSnap.empty) {
      refundItems.push(refundSnap.docs[0].data() as RevenueLedgerItem);
      continue;
    }

    // Update original SALE status to reversed
    batch.update(doc.ref, { status: "reversed", updated_at: now });

    // Create negative REFUND entry
    const refundId = uuidv4();
    const refundItem: RevenueLedgerItem = {
      id: refundId,
      order_id: sale.order_id,
      order_item_id: sale.order_item_id,
      product_id: sale.product_id,
      admin_id: sale.admin_id,
      gross_amount: -Math.abs(sale.gross_amount),
      admin_share_percentage: sale.admin_share_percentage,
      super_admin_share_percentage: sale.super_admin_share_percentage,
      admin_share_amount: -Math.abs(sale.admin_share_amount),
      super_admin_share_amount: -Math.abs(sale.super_admin_share_amount),
      transaction_type: "REFUND",
      status: "completed",
      currency: sale.currency || "INR",
      notes: reason || "Customer refund reversal",
      created_at: now,
      updated_at: now,
    };

    refundItems.push(refundItem);
    batch.set(db.collection("revenue_ledger").doc(refundId), refundItem);
  }

  await batch.commit();
  return refundItems;
};

/**
 * Fetches paginated revenue ledger records with optional date range, type, and admin filters.
 */
export const getRevenueLedgerModel = async (options: {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  transactionType?: RevenueTransactionType;
  adminId?: string;
}): Promise<{ items: RevenueLedgerItem[]; total: number }> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));

  let query: FirebaseFirestore.Query = db.collection("revenue_ledger");

  if (options.transactionType) {
    query = query.where("transaction_type", "==", options.transactionType);
  }
  if (options.adminId) {
    query = query.where("admin_id", "==", options.adminId);
  }

  const snapshot = await query.get();
  let items = snapshot.docs.map((doc) => doc.data() as RevenueLedgerItem);

  // In-memory date filtering
  if (options.fromDate) {
    const fromTime = new Date(options.fromDate).getTime();
    items = items.filter((i) => new Date(i.created_at).getTime() >= fromTime);
  }
  if (options.toDate) {
    const toTime = new Date(options.toDate).getTime();
    items = items.filter((i) => new Date(i.created_at).getTime() <= toTime);
  }

  // Sort descending by created_at
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = items.length;
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  // Enrich each ledger item with product name, sale rate, and quantity
  const enrichedItems = await Promise.all(
    paginatedItems.map(async (item) => {
      let product_name: string | undefined = undefined;
      let sale_rate: number | undefined = undefined;
      let quantity: number = 1;
      let admin_name: string | undefined = undefined;

      try {
        if (item.order_item_id) {
          const oiDoc = await db.collection("order_items").doc(item.order_item_id).get();
          if (oiDoc.exists) {
            const oiData = oiDoc.data();
            product_name = oiData?.product_name_snapshot;
            sale_rate = oiData?.price_snapshot ?? oiData?.final_unit_price;
            quantity = oiData?.quantity ?? 1;
          }
        }

        if (!product_name && item.product_id) {
          const pDoc = await db.collection("products").doc(item.product_id).get();
          if (pDoc.exists) {
            const pData = pDoc.data();
            product_name = pData?.product_name;
            if (sale_rate === undefined) {
              sale_rate = pData?.price;
            }
          }
        }

        if (item.admin_id && item.admin_id !== "system") {
          const adminDoc = await db.collection("admins").doc(item.admin_id).get();
          if (adminDoc.exists) {
            admin_name = adminDoc.data()?.full_name;
          }
        }
      } catch (err) {
        console.warn("Failed to enrich ledger item:", err);
      }

      if (sale_rate === undefined && item.gross_amount) {
        sale_rate = Math.abs(item.gross_amount) / (quantity || 1);
      }

      return {
        ...item,
        product_name: product_name || "Bangle Product",
        sale_rate: sale_rate ?? item.gross_amount,
        quantity: quantity || 1,
        admin_name: admin_name || "Store Admin",
      };
    })
  );

  return { items: enrichedItems as any, total };
};
