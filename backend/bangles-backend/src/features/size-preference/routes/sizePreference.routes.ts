import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import {
  getSizePreferences,
  createSizePreference,
  updateSizePreference,
  deleteSizePreference
} from "../controllers/sizePreference.controller";

const router = Router();

// All size preference routes require authentication
router.use(authenticate);

router.get("/", getSizePreferences);
router.post("/", createSizePreference);
router.put("/:id", updateSizePreference);
router.delete("/:id", deleteSizePreference);

export default router;
