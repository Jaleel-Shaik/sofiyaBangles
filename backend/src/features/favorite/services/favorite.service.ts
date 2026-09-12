import { Favorite } from "../../../models/favorite.model";
import { v4 as uuidv4 } from "uuid";
import {
  findFavoriteDb,
  insertFavoriteDb,
  deleteFavoriteDb,
  getUserFavoritesDb,
} from "../../../db/favorite.db";
import { getProductByIdDb, getVariantsByProductDb, getImagesByProductDb } from "../../../db/product.db";
import { getCategoryByIdDb } from "../../../db/category.db";

/**
 * Business Logic: Validates product exists and is active, then adds to favorites.
 */
export const addFavoriteService = async (
  userId: string,
  productId: string
): Promise<Favorite> => {
  const product = await getProductByIdDb(productId);
  if (!product || !product.is_active) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const existing = await findFavoriteDb(userId, productId);
  if (existing) {
    return existing;
  }

  const newId = uuidv4();
  const favoriteData: Favorite = {
    id: newId,
    user_id: userId,
    product_id: productId,
    created_at: new Date().toISOString(),
  };

  return await insertFavoriteDb(favoriteData);
};

/**
 * Business Logic: Removes a product from user's favorites.
 */
export const removeFavoriteService = async (
  userId: string,
  productId: string
): Promise<void> => {
  await deleteFavoriteDb(userId, productId);
};

/**
 * Business Logic: Retrieves user favorites enriched with product and category snapshots.
 */
export const getUserFavoritesService = async (
  userId: string
): Promise<any[]> => {
  const rawFavorites = await getUserFavoritesDb(userId);
  if (rawFavorites.length === 0) return [];

  const favoritePromises = rawFavorites.map(async (fav) => {
    const product = await getProductByIdDb(fav.product_id);

    if (!product || !product.is_active) {
      return null;
    }

    let category_name = undefined;
    if (product.category_id) {
      const cat = await getCategoryByIdDb(product.category_id);
      if (cat) {
        category_name = cat.category_name;
      }
    }

    const variants = await getVariantsByProductDb(product.id);
    const images = await getImagesByProductDb(product.id);

    return {
      ...fav,
      product: {
        ...product,
        category_name,
        is_favorited: true,
        variants,
        images,
      },
    };
  });

  const resolved = await Promise.all(favoritePromises);
  return resolved.filter(Boolean);
};
