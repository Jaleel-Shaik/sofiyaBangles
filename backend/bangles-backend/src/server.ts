import { env } from "./config/env";
import app from "./app";
import { cleanupExpiredSessionsAndTokens } from "./services/totp.service";

// Start periodic cleanup of expired sessions and refresh tokens
const startSessionCleanup = () => {
  const cleanup = async () => {
    try {
      await cleanupExpiredSessionsAndTokens();
    } catch (error) {
      console.error("Session cleanup error:", error);
    }
  };
  
  // Run cleanup immediately on startup
  cleanup();
  
  // Then run at the configured interval
  setInterval(cleanup, env.SESSION_CLEANUP_INTERVAL_MS);
  console.log(`⏰ Session cleanup scheduled every ${env.SESSION_CLEANUP_INTERVAL_MS / 60000} minutes`);
};

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Sofiya Bangles API Server`);
  console.log(`   Running on: http://localhost:${env.PORT}`);
  console.log(`   Health:     http://localhost:${env.PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
  
  // Start session cleanup scheduler
  startSessionCleanup();
});