import {
  addFavoriteRepo,
  removeFavoriteRepo,
  getUserFavoritesRepo,
} from "../repositories/favorite.repository";

export const addFavoriteService = async (userId: string, productId: string) => {
  return addFavoriteRepo(userId, productId);
};

export const removeFavoriteService = async (
  userId: string,
  productId: string,
) => {
  return removeFavoriteRepo(userId, productId);
};

export const getUserFavoritesService = async (userId: string) => {
  return getUserFavoritesRepo(userId);
};
