import { Router } from "express";
import {
  getCart,
  addItemToCart,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { upsertCartItemSchema } from "../validations/cart.validation";

const router = Router();

// All cart routes require authenticated customer
router.use(authenticate);

router.get("/", getCart);
router.post("/items", validate(upsertCartItemSchema), addItemToCart);
router.delete("/items/:id", removeCartItem);
router.delete("/clear", clearCart);

export default router;
