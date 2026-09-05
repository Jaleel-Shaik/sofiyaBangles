import { db } from "../shared/config/firebase";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { createRevenueAllocationModel, createRefundReversalModel } from "../features/order/models/revenueLedger.model";
import { createAuditLogModel } from "../shared/models/audit.model";

/**
 * Seed SuperAdmin Module CLI Script
 */
export async function seedSuperAdminModule(credentials?: { email?: string; password?: string }) {
  console.log("🚀 Starting SuperAdmin Module Database Seeding...");

  const superAdminEmail = credentials?.email || process.env.SUPER_ADMIN_SEED_EMAIL;
  const superAdminPassword = credentials?.password || process.env.SUPER_ADMIN_SEED_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      "Missing SuperAdmin credentials!\n" +
      "Please provide them using environment variables or function arguments:\n" +
      "  SUPER_ADMIN_SEED_EMAIL=... SUPER_ADMIN_SEED_PASSWORD=...\n" +
      "Plaintext credentials are intentionally not hardcoded in the codebase."
    );
  }

  // 1. Seed SuperAdmin User in 'admins' collection
  const superAdminId = "super_admin_seeded_01";
  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
  const now = new Date().toISOString();

  await db.collection("admins").doc(superAdminId).set({
    id: superAdminId,
    full_name: "Sofiya SuperAdmin Owner",
    email: superAdminEmail,
    phone: process.env.SUPER_ADMIN_SEED_PHONE || null,
    avatar_url: null,
    role: "super_admin",
    password_hash: superAdminHash,
    is_active: true,
    isActive: true,
    is_2fa_enabled: false,
    twoFactorEnabled: false,
    two_fa_secret: null,
    twoFactorSecretEncrypted: null,
    pendingTwoFactorSecretEncrypted: null,
    backupCodesHash: [],
    failedOtpAttempts: 0,
    accountLockedUntil: null,
    created_at: now,
    updated_at: now,
  }, { merge: true });
  console.log(`✅ SuperAdmin account created: ${superAdminEmail}`);

  // 2. Seed Admin User in 'admins' collection
  const adminId = "admin_seeded_01";
  const adminHash = await bcrypt.hash("AdminPass@123", 12);
  await db.collection("admins").doc(adminId).set({
    id: adminId,
    full_name: "General Admin Manager",
    email: "admin@sofiya.com",
    phone: "+919876543211",
    avatar_url: null,
    role: "admin",
    password_hash: adminHash,
    is_active: true,
    is_2fa_enabled: false,
    created_at: now,
    updated_at: now,
  });
  console.log("✅ Admin account created: admin@sofiya.com");

  // 3. Seed Platform Commission Settings (70/30)
  await db.collection("platform_settings").doc("commission").set({
    admin_percentage: 70,
    super_admin_percentage: 30,
    updated_at: now,
    updated_by: superAdminId,
  });
  console.log("✅ Platform commission set to 70% Admin / 30% SuperAdmin.");

  // 4. Seed Model Types & Categories
  const mtId = "model_bangles_01";
  await db.collection("model_types").doc(mtId).set({
    id: mtId,
    name: "Designer Bangles",
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  const catId = "cat_gold_bangles_01";
  await db.collection("categories").doc(catId).set({
    id: catId,
    category_name: "Gold Plated Bangles",
    image_url: null,
    display_order: 1,
    is_active: true,
    model_type_id: mtId,
    created_at: now,
    updated_at: now,
  });

  // 5. Seed Test Products with Creator Ownership
  const prd1Id = "prd_bangle_luxury_01";
  await db.collection("products").doc(prd1Id).set({
    id: prd1Id,
    unique_code: "DES-1001",
    product_name: "Royal Antique Gold Bangle Set",
    description: "Handcrafted 24k gold-plated traditional bridal bangles",
    price: 4999,
    image_url: "https://images.unsplash.com/photo-1611591475777-233cd7c5e784?w=500",
    category_id: catId,
    model_type_id: mtId,
    quantity: 25,
    likes: 120,
    rating: 4.9,
    reviews: 18,
    is_active: true,
    status: "active",
    created_by: adminId,
    created_by_role: "admin",
    updated_by: adminId,
    created_at: now,
    updated_at: now,
  });

  const prd2Id = "prd_bangle_ruby_02";
  await db.collection("products").doc(prd2Id).set({
    id: prd2Id,
    unique_code: "DES-1002",
    product_name: "Ruby Studded Velvet Bangles",
    description: "Premium velvet bangles with ruby stone highlights",
    price: 1999,
    image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500",
    category_id: catId,
    model_type_id: mtId,
    quantity: 4, // Low stock alert scenario
    likes: 45,
    rating: 4.7,
    reviews: 9,
    is_active: true,
    status: "active",
    created_by: adminId,
    created_by_role: "admin",
    updated_by: adminId,
    created_at: now,
    updated_at: now,
  });

  console.log("✅ Products seeded with admin ownership.");

  // 6. Seed Completed Orders with 70/30 Revenue Ledger
  const order1Id = "order_completed_01";
  await db.collection("orders").doc(order1Id).set({
    id: order1Id,
    user_id: "user_customer_01",
    order_number: "ORD-900001",
    status: "completed",
    payment_status: "paid",
    subtotal: 4999,
    discount: 0,
    shipping_amount: 0,
    tax_amount: 0,
    total_amount: 4999,
    shipping_address_snapshot: {
      name: "Priya Sharma",
      phone: "+919876500000",
      address_line_1: "123 MG Road",
      city: "Bangalore",
      state: "Karnataka",
      postal_code: "560001",
      country: "India",
      is_default: true,
    },
    completed_at: now,
    created_at: now,
    updated_at: now,
  });

  const order1ItemId = "item_completed_01";
  await db.collection("order_items").doc(order1ItemId).set({
    id: order1ItemId,
    order_id: order1Id,
    product_id: prd1Id,
    variant_id: null,
    category_id: catId,
    category_name_snapshot: "Gold Plated Bangles",
    product_name_snapshot: "Royal Antique Gold Bangle Set",
    price_snapshot: 4999,
    quantity: 1,
    subtotal: 4999,
    created_at: now,
  });

  await createRevenueAllocationModel({
    orderId: order1Id,
    orderItemId: order1ItemId,
    productId: prd1Id,
    adminId: adminId,
    grossAmount: 4999,
    transactionType: "SALE",
    notes: "Seeded sale transaction",
  });

  // 7. Seed Refunded Order with Reversal Ledger
  const order2Id = "order_refunded_02";
  await db.collection("orders").doc(order2Id).set({
    id: order2Id,
    user_id: "user_customer_02",
    order_number: "ORD-900002",
    status: "returned",
    payment_status: "refunded",
    subtotal: 1999,
    discount: 0,
    shipping_amount: 0,
    tax_amount: 0,
    total_amount: 1999,
    refunded_at: now,
    refund_reason: "Customer size exchange refund",
    created_at: now,
    updated_at: now,
  });

  const order2ItemId = "item_refunded_02";
  await db.collection("order_items").doc(order2ItemId).set({
    id: order2ItemId,
    order_id: order2Id,
    product_id: prd2Id,
    variant_id: null,
    category_id: catId,
    category_name_snapshot: "Gold Plated Bangles",
    product_name_snapshot: "Ruby Studded Velvet Bangles",
    price_snapshot: 1999,
    quantity: 1,
    subtotal: 1999,
    created_at: now,
  });

  // Initial sale ledger record
  await createRevenueAllocationModel({
    orderId: order2Id,
    orderItemId: order2ItemId,
    productId: prd2Id,
    adminId: adminId,
    grossAmount: 1999,
    transactionType: "SALE",
  });

  // Refund reversal ledger record
  await createRefundReversalModel(order2Id, "Customer size exchange refund");

  console.log("✅ Orders and 70/30 Revenue Ledgers seeded.");

  // 8. Seed SuperAdmin Notifications & Audit Log
  const notifId = uuidv4();
  await db.collection("notifications").doc(notifId).set({
    id: notifId,
    title: "System Seeding Complete",
    body: "SuperAdmin Revenue & Analytics module initialized successfully.",
    type: "NEW_SALE",
    product_id: null,
    sent_by: superAdminId,
    user_id: null,
    is_read: false,
    created_at: now,
  });

  await createAuditLogModel({
    actor_id: superAdminId,
    action: "SYSTEM_SEEDED",
    table_name: "system",
    record_id: "seed_01",
    new_data: { super_admin_email: superAdminEmail, admin_email: "admin@sofiya.com" },
  });

  console.log("🎉 Database seeding for SuperAdmin module completed successfully!");
}

if (require.main === module) {
  seedSuperAdminModule().then(() => process.exit(0)).catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}
