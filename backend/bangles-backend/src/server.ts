import { env } from "./shared/config/env";
import { initializeApp } from "firebase-admin/app";
import app from "./app";
const PORT = env.PORT || 5000;
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
export default app;
