import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import {
  getSizePreferences,
  createSizePreference,
  updateSizePreference,
  deleteSizePreference
} from "../controllers/sizePreference.controller";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { createSizePreferenceSchema, updateSizePreferenceSchema } from "../validations/sizePreference.validation";

const router = Router();

// All size preference routes require authentication
router.use(authenticate);

router.get("/", getSizePreferences);
router.post("/", validate(createSizePreferenceSchema), createSizePreference);
router.put("/:id", validate(updateSizePreferenceSchema), updateSizePreference);
router.delete("/:id", deleteSizePreference);

export default router;
