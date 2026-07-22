import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorite.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";

const router = Router();

// All favorite routes require authentication
router.use(authenticate);

router.get("/", getFavorites);
router.post("/:productId", addFavorite);
router.delete("/:productId", removeFavorite);

export default router;
