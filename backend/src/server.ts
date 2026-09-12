import { env } from "./shared/config/env";
import app from "./app";
import { cleanupExpiredSessionsAndTokens } from "./features/auth/services/totp.service";

const PORT = env.PORT || 5000;
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

const server = app.listen(PORT, "0.0.0.0", () => {
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

const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  clearInterval(cleanupInterval);

  server.close((err) => {
    if (err) {
      console.error("Error closing HTTP server:", err);
      process.exit(1);
    }
    console.log("HTTP server closed. Exiting cleanly.");
    process.exit(0);
  });

  // Force exit if hanging beyond 10 seconds
  setTimeout(() => {
    console.error("Forceful shutdown timeout reached. Exiting immediately.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default app;
