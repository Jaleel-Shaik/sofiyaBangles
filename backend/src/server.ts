import { env } from "./shared/config/env";
import app from "./app";
import { cleanupExpiredSessionsAndTokens } from "./features/auth/services/totp.service";
const PORT = env.PORT || 5000;
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

/**
 * Periodic cleanup job (default every 1 hour).
 * Permanently deletes temporary records (challenges, sessions, tokens) and
 * prunes audit logs / security events past their retention window.
 */
const cleanupInterval = setInterval(() => {
  cleanupExpiredSessionsAndTokens().catch((err) => {
    console.error("Cleanup job error:", err);
  });
}, env.SESSION_CLEANUP_INTERVAL_MS);

// Run once shortly after boot so leftover records are cleared quickly
setTimeout(() => {
  cleanupExpiredSessionsAndTokens().catch((err) => {
    console.error("Initial cleanup error:", err);
  });
}, 5000);

process.on("SIGINT", () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});

export default app;
