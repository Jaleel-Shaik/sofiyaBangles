import fs from "fs";
import path from "path";
import { pool } from "../config/supabase";

async function runMigrations() {
  console.log("🚀 Running database migrations...\n");

  const migrationsDir = path.join(__dirname);
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`📄 Executing: ${file}`);

    try {
      await pool.query(sql);
      console.log(`✅ ${file} — success\n`);
    } catch (error: any) {
      console.error(`❌ ${file} — failed`);
      console.error(`   Error: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log("🎉 All migrations completed successfully!");
  await pool.end();
  process.exit(0);
}

runMigrations();
