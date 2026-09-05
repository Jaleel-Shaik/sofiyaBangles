import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../shared/config/firebase";
import bcrypt from "bcryptjs";
import { nowISTISO } from "../shared/utils/datetime";

function parseCliArgs(): { email?: string; password?: string; phone?: string; full_name?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; password?: string; phone?: string; full_name?: string } = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--email=")) {
      result.email = arg.split("=")[1];
    } else if (arg === "--email" && args[i + 1]) {
      result.email = args[++i];
    } else if (arg.startsWith("--password=")) {
      result.password = arg.split("=")[1];
    } else if (arg === "--password" && args[i + 1]) {
      result.password = args[++i];
    } else if (arg.startsWith("--phone=")) {
      result.phone = arg.split("=")[1];
    } else if (arg === "--phone" && args[i + 1]) {
      result.phone = args[++i];
    } else if (arg.startsWith("--name=")) {
      result.full_name = arg.split("=")[1];
    } else if (arg === "--name" && args[i + 1]) {
      result.full_name = args[++i];
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  // Fallback to positional arguments if flags were stripped by shell/npm
  if (!result.email && positional[0]) {
    result.email = positional[0];
  }
  if (!result.password && positional[1]) {
    result.password = positional[1];
  }
  if (!result.phone && positional[2]) {
    result.phone = positional[2];
  }

  return result;
}

/**
 * Seed or Update SuperAdmin Account according to strict initial state requirements:
 * 
 * role = super_admin
 * isActive = true
 * twoFactorEnabled = false
 * twoFactorSecretEncrypted = null
 * pendingTwoFactorSecretEncrypted = null
 * backupCodesHash = []
 * 
 * Credentials must be provided via CLI flags or environment variables:
 * SUPER_ADMIN_SEED_EMAIL, SUPER_ADMIN_SEED_PASSWORD, and optional SUPER_ADMIN_SEED_PHONE.
 * Plaintext credentials and personal phone numbers are NOT hardcoded in source code.
 */
export async function seedSuperAdminAccount(customCredentials?: { email?: string; password?: string; phone?: string; full_name?: string }) {
  console.log("🌱 Preparing SuperAdmin Account Seeding...");

  const cliArgs = parseCliArgs();
  const rawEmail = customCredentials?.email || cliArgs.email || process.env.SUPER_ADMIN_SEED_EMAIL;
  const rawPassword = customCredentials?.password || cliArgs.password || process.env.SUPER_ADMIN_SEED_PASSWORD;
  const phone = customCredentials?.phone || cliArgs.phone || process.env.SUPER_ADMIN_SEED_PHONE || null;
  const fullName = customCredentials?.full_name || cliArgs.full_name || process.env.SUPER_ADMIN_SEED_NAME || "Super Admin";

  if (!rawEmail || !rawPassword) {
    throw new Error(
      "Missing SuperAdmin credentials!\n" +
      "Please provide them using environment variables or CLI flags:\n" +
      "  Option A: SUPER_ADMIN_SEED_EMAIL=... SUPER_ADMIN_SEED_PASSWORD=... npx ts-node src/scripts/seed-superadmin.ts\n" +
      "  Option B: npx ts-node src/scripts/seed-superadmin.ts --email <email> --password <password> [--phone <phone>]\n" +
      "Plaintext credentials are intentionally not hardcoded in the codebase."
    );
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;

  const password_hash = await bcrypt.hash(password, 12);
  const now = nowISTISO();

  // Check if superadmin already exists in 'admins' collection by email
  const existingSnapshot = await db.collection("admins").where("email", "==", email).limit(1).get();

  let docId = "super_admin_seeded_01";
  if (!existingSnapshot.empty) {
    docId = existingSnapshot.docs[0].id;
    console.log(`Found existing SuperAdmin doc with ID: ${docId}. Updating to initial seeded state...`);
  } else {
    console.log(`Creating new SuperAdmin doc with ID: ${docId}...`);
  }

  const superAdminData = {
    id: docId,
    full_name: fullName,
    email,
    phone,
    role: "super_admin",
    password_hash,
    avatar_url: null,
    expo_push_token: null,
    is_active: true,
    isActive: true,
    is_2fa_enabled: false,
    twoFactorEnabled: false,
    two_fa_secret: null,
    twoFactorSecretEncrypted: null,
    pendingTwoFactorSecretEncrypted: null,
    backupCodesHash: [],
    failedOtpAttempts: 0,
    failed_attempts: 0,
    accountLockedUntil: null,
    two_fa_updated_at: null,
    twoFactorEnabledAt: null,
    created_at: now,
    updated_at: now,
  };

  await db.collection("admins").doc(docId).set(superAdminData, { merge: true });

  console.log("✅ SuperAdmin account seeded successfully:");
  console.log(`   Email: ${email}`);
  console.log(`   Role: super_admin`);
  console.log(`   isActive: true`);
  console.log(`   twoFactorEnabled: false`);
  console.log(`   twoFactorSecretEncrypted: null`);
  console.log(`   pendingTwoFactorSecretEncrypted: null`);
  console.log(`   backupCodesHash: []`);

  return { docId, email };
}

if (require.main === module) {
  seedSuperAdminAccount()
    .then(() => {
      console.log("🎉 Seeding complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err.message || err);
      process.exit(1);
    });
}
