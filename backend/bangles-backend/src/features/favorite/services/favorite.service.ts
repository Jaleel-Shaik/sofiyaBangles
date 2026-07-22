import {
  addFavoriteModel,
  removeFavoriteModel,
  getUserFavoritesModel,
} from "../models/favorite.model";

export const addFavoriteService = async (userId: string, productId: string) => {
  return addFavoriteModel(userId, productId);
};

export const removeFavoriteService = async (
  userId: string,
  productId: string,
) => {
  return removeFavoriteModel(userId, productId);
};

export const getUserFavoritesService = async (userId: string) => {
  return getUserFavoritesModel(userId);
};
