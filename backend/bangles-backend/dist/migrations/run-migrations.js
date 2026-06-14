"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
async function runMigrations() {
    console.log("🚀 Running database migrations...\n");
    const migrationsDir = path_1.default.join(__dirname);
    const sqlFiles = fs_1.default
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    for (const file of sqlFiles) {
        const filePath = path_1.default.join(migrationsDir, file);
        const sql = fs_1.default.readFileSync(filePath, "utf-8");
        console.log(`📄 Executing: ${file}`);
        try {
            await supabase_1.pool.query(sql);
            console.log(`✅ ${file} — success\n`);
        }
        catch (error) {
            console.error(`❌ ${file} — failed`);
            console.error(`   Error: ${error.message}\n`);
            process.exit(1);
        }
    }
    console.log("🎉 All migrations completed successfully!");
    await supabase_1.pool.end();
    process.exit(0);
}
runMigrations();
