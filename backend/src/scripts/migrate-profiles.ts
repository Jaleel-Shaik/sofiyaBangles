import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../shared/config/firebase";

/**
 * One-time migration: splits the legacy single `profiles` collection into
 * `users` (role === "user") and `admins` (role === "admin" | "super_admin").
 *
 * Run with: npx ts-node src/scripts/migrate-profiles.ts
 */
const migrateProfiles = async () => {
  console.log("Migrating profiles -> users / admins ...");

  const snapshot = await db.collection("profiles").get();
  console.log(`Found ${snapshot.size} profile(s).`);

  let users = 0;
  let admins = 0;
  const skipped: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const role = data.role || "user";
    const target = role === "admin" || role === "super_admin" ? "admins" : "users";

    // Skip if the account already exists in the target collection
    const existing = await db.collection(target).doc(doc.id).get();
    if (existing.exists) {
      skipped.push(doc.id);
      continue;
    }

    await db.collection(target).doc(doc.id).set(data);
    if (target === "admins") admins++;
    else users++;
  }

  console.log(`Migrated ${users} user(s) and ${admins} admin(s).`);
  console.log(`Skipped (already present): ${skipped.length}`);
  console.log("Migration complete. You may now delete the legacy 'profiles' collection manually.");
  process.exit(0);
};

migrateProfiles();
