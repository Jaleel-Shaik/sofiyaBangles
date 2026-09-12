import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  addFavoriteService,
  removeFavoriteService,
  getUserFavoritesService,
} from "../services/favorite.service";
import { NotFoundError } from "../../../core/errors/app.error";

export const getFavorites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const favorites = await getUserFavoritesService(req.user!.userId);
  return sendSuccess(res, favorites);
});

export const addFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = getParam(req, "productId");
  try {
    const favorite = await addFavoriteService(req.user!.userId, productId);
    return sendSuccess(res, favorite, { message: "Added to favorites.", statusCode: 201 });
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") {
      throw new NotFoundError("Product not found or inactive.");
    }
    throw err;
  }
});

export const removeFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = getParam(req, "productId");
  await removeFavoriteService(req.user!.userId, productId);
  return sendSuccess(res, null, "Removed from favorites.");
});
