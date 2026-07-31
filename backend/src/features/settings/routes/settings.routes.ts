import { Router } from "express";
import { getBusinessProfile, updateBusinessProfile, uploadBusinessLogo } from "../controllers/settings.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { upload } from "../../../shared/middlewares/upload.middleware";
import { updateBusinessProfileSchema } from "../validations/settings.validation";

const router = Router();

// Public route to get settings
router.get("/business-profile", getBusinessProfile);

// Admin route to update settings
router.put("/business-profile", authenticate, requireRole("admin", "super_admin"), validate(updateBusinessProfileSchema), updateBusinessProfile);

// Admin route to upload store logo
router.post("/business-profile/logo", authenticate, requireRole("admin", "super_admin"), upload.single("logo"), uploadBusinessLogo);

export default router;
