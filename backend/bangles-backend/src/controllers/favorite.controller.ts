import { Response } from "express";
import { AuthRequest } from "../types";
import { getParam } from "../utils/params";
import {
  addFavoriteService,
  removeFavoriteService,      
  getUserFavoritesService,
} from "../services/favorite.service";

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await getUserFavoritesService(req.user!.userId);

    res.json({
      success: true,
      data: favorites,
    });
  } catch (error: any) {
    console.error("GetFavorites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch favorites.",
    });
  }
};

export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const productId = getParam(req, "productId");
    const favorite = await addFavoriteService(req.user!.userId, productId);

    res.status(201).json({
      success: true,
      data: favorite,
      message: "Added to favorites.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Product not found or inactive." });
      return;
    }
    console.error("AddFavorite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add favorite.",
    });
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const productId = getParam(req, "productId");
    await removeFavoriteService(req.user!.userId, productId);

    res.json({
      success: true,
      message: "Removed from favorites.",
    });
  } catch (error: any) {
    console.error("RemoveFavorite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove favorite.",
    });
  }
};
