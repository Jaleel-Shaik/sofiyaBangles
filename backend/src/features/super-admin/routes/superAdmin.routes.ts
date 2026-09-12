import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import {
  getDashboard,
  getSalesList,
  getSaleDetail,
  getProductsAnalytics,
  getProductAnalyticsDetail,
  getRevenueLedger,
  getAdminActivity,
  getNotifications,
  markNotificationRead,
  getCommissionSettings,
  updateCommissionSettings,
  exportSalesCsv,
  exportRevenueCsv,
  exportProductsCsv,
} from "../controllers/superAdmin.controller";

import {
  listAdmins,
  createAdmin,
  updateAdminStatus,
  deleteAdmin,
} from "../controllers/adminStaff.controller";

import {
  createAdminSchema,
  updateAdminStatusSchema,
  updateCommissionSettingsSchema,
} from "../validations/superAdmin.validation";

const router = Router();

// Protect all SuperAdmin endpoints with authentication and super_admin role check
router.use(authenticate);
router.use(requireRole("super_admin"));

// Sub-admin management
router.get("/admins", listAdmins);
router.post("/admins", validate(createAdminSchema), createAdmin);
router.patch("/admins/:id/status", validate(updateAdminStatusSchema), updateAdminStatus);
router.delete("/admins/:id", deleteAdmin);

router.get("/dashboard", getDashboard);
router.get("/sales", getSalesList);
router.get("/sales/:id", getSaleDetail);
router.get("/products-analytics", getProductsAnalytics);
router.get("/products-analytics/:id", getProductAnalyticsDetail);
router.get("/revenue", getRevenueLedger);
router.get("/activity", getAdminActivity);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

// Settings & Commissions
router.get("/settings/commission", getCommissionSettings);
router.put("/settings/commission", validate(updateCommissionSettingsSchema), updateCommissionSettings);

router.get("/export/sales", exportSalesCsv);
router.get("/export/revenue", exportRevenueCsv);
router.get("/export/products", exportProductsCsv);

export default router;
