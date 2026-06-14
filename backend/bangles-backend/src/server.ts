import { env } from "./config/env";
import app from "./app";

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Sofiya Bangles API Server`);
  console.log(`   Running on: http://localhost:${env.PORT}`);
  console.log(`   Health:     http://localhost:${env.PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});