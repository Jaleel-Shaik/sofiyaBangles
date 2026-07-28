import { Router } from "express";
import { getBusinessProfile, updateBusinessProfile } from "../controllers/settings.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { updateBusinessProfileSchema } from "../validations/settings.validation";

const router = Router();

// Public route to get settings
router.get("/business-profile", getBusinessProfile);

// Admin route to update settings
router.put("/business-profile", authenticate, requireRole("admin", "super_admin"), validate(updateBusinessProfileSchema), updateBusinessProfile);

export default router;
