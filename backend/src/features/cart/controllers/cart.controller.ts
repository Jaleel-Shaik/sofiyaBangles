import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { CartService } from "../services/cart.service";

export const getCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await CartService.getUserCart(req.user!.userId);
  return sendSuccess(res, result);
});

export const addItemToCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await CartService.addItem(req.user!.userId, req.body);
  return sendSuccess(res, item, { message: "Item added to cart.", statusCode: 201 });
});

export const removeCartItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  await CartService.removeItem(req.user!.userId, id);
  return sendSuccess(res, null, "Item removed from cart.");
});

export const clearCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  await CartService.clearCart(req.user!.userId);
  return sendSuccess(res, null, "Cart cleared successfully.");
});
