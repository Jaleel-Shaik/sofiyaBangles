import { db } from "../shared/config/firebase";
import { RevenueLedgerItem, PlatformCommissionSettings, RevenueTransactionType } from "../shared/types";

const DEFAULT_COMMISSION_SETTINGS: PlatformCommissionSettings = {
  admin_percentage: 70,
  super_admin_percentage: 30,
  updated_at: new Date().toISOString(),
  updated_by: "system",
};

/**
 * Pure Database Operation: Retrieve commission settings document.
 */
export const getPlatformCommissionSettingsDb = async (): Promise<PlatformCommissionSettings> => {
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
 * Pure Database Operation: Set commission settings document.
 */
export const setPlatformCommissionSettingsDb = async (
  adminPctOrSettings: number | Partial<PlatformCommissionSettings>,
  superAdminPctOrActorId?: number | string,
  actorId?: string
): Promise<PlatformCommissionSettings> => {
  let settings: PlatformCommissionSettings;
  if (typeof adminPctOrSettings === "number") {
    settings = {
      admin_percentage: adminPctOrSettings,
      super_admin_percentage: typeof superAdminPctOrActorId === "number" ? superAdminPctOrActorId : 30,
      updated_at: new Date().toISOString(),
      updated_by: typeof actorId === "string" ? actorId : "system",
    };
  } else {
    settings = {
      admin_percentage: adminPctOrSettings.admin_percentage ?? 70,
      super_admin_percentage: adminPctOrSettings.super_admin_percentage ?? 30,
      updated_at: new Date().toISOString(),
      updated_by: typeof superAdminPctOrActorId === "string" ? superAdminPctOrActorId : adminPctOrSettings.updated_by || "system",
    };
  }
  await db.collection("platform_settings").doc("commission").set(settings);
  return settings;
};

/**
 * Pure Database Operation: Check if a ledger record exists for order & item & type.
 */
export const findExistingLedgerItemDb = async (
  orderId: string,
  orderItemId: string,
  transactionType: RevenueTransactionType
): Promise<RevenueLedgerItem | null> => {
  const existingSnap = await db
    .collection("revenue_ledger")
    .where("order_id", "==", orderId)
    .where("order_item_id", "==", orderItemId)
    .where("transaction_type", "==", transactionType)
    .limit(1)
    .get();

  if (!existingSnap.empty) return null;
  return existingSnap.docs[0].data() as RevenueLedgerItem;
};

/**
 * Pure Database Operation: Insert a single revenue ledger item.
 */
export const insertRevenueLedgerItemDb = async (
  item: RevenueLedgerItem
): Promise<RevenueLedgerItem> => {
  await db.collection("revenue_ledger").doc(item.id).set(item);
  return item;
};

/**
 * Pure Database Operation: Fetch all sale ledger entries for an order.
 */
export const getSaleLedgerEntriesForOrderDb = async (
  orderId: string
): Promise<RevenueLedgerItem[]> => {
  const snapshot = await db
    .collection("revenue_ledger")
    .where("order_id", "==", orderId)
    .where("transaction_type", "==", "SALE")
    .get();

  return snapshot.docs.map((doc) => doc.data() as RevenueLedgerItem);
};

/**
 * Pure Database Operation: Check if a refund record already exists for an order item.
 */
export const findRefundItemDb = async (
  orderId: string,
  orderItemId: string
): Promise<RevenueLedgerItem | null> => {
  const snapshot = await db
    .collection("revenue_ledger")
    .where("order_id", "==", orderId)
    .where("order_item_id", "==", orderItemId)
    .where("transaction_type", "==", "REFUND")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as RevenueLedgerItem;
};

/**
 * Pure Database Operation: Batch update reversed sales and insert refund ledger items.
 */
export const batchApplyRefundReversalDb = async (
  salesToReverse: FirebaseFirestore.DocumentReference[],
  refundsToInsert: RevenueLedgerItem[]
): Promise<void> => {
  const batch = db.batch();
  const now = new Date().toISOString();

  salesToReverse.forEach((ref) => {
    batch.update(ref, { status: "reversed", updated_at: now });
  });

  refundsToInsert.forEach((item) => {
    batch.set(db.collection("revenue_ledger").doc(item.id), item);
  });

  await batch.commit();
};

/**
 * Pure Database Operation: Query raw revenue ledger items with pagination and filters.
 */
export const queryRevenueLedgerDb = async (options?: {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  transactionType?: RevenueTransactionType;
  adminId?: string;
}): Promise<{ items: RevenueLedgerItem[]; total: number }> => {
  let query: FirebaseFirestore.Query = db.collection("revenue_ledger");

  if (options?.transactionType) {
    query = query.where("transaction_type", "==", options.transactionType);
  }
  if (options?.adminId) {
    query = query.where("admin_id", "==", options.adminId);
  }

  const snapshot = await query.get();
  let items = snapshot.docs.map((doc) => doc.data() as RevenueLedgerItem);

  if (options?.fromDate) {
    const fromTime = new Date(options.fromDate).getTime();
    items = items.filter((i) => new Date(i.created_at).getTime() >= fromTime);
  }
  if (options?.toDate) {
    const toTime = new Date(options.toDate).getTime();
    items = items.filter((i) => new Date(i.created_at).getTime() <= toTime);
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = items.length;
  if (options?.page && options?.limit) {
    const offset = (options.page - 1) * options.limit;
    return { items: items.slice(offset, offset + options.limit), total };
  }
  if (options?.limit) {
    return { items: items.slice(0, options.limit), total };
  }

  return { items, total };
};
