import { db } from "../config/firebase";
import { Favorite, Product } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const addFavoriteRepo = async (
  userId: string,
  productId: string,
): Promise<Favorite> => {
  const existingSnapshot = await db.collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].data() as Favorite;
  }

  const newId = uuidv4();
  const favoriteData: Favorite = {
    id: newId,
    user_id: userId,
    product_id: productId,
    created_at: new Date().toISOString()
  };

  await db.collection("favorites").doc(newId).set(favoriteData);
  return favoriteData;
};

export const removeFavoriteRepo = async (
  userId: string,
  productId: string,
): Promise<void> => {
  const snapshot = await db.collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};

export const getUserFavoritesRepo = async (
  userId: string,
): Promise<Product[]> => {
  const favSnapshot = await db.collection("favorites")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  if (favSnapshot.empty) return [];

  const favorites = favSnapshot.docs.map(doc => doc.data() as Favorite);

  const productPromises = favorites.map(async (fav) => {
    const productDoc = await db.collection("products").doc(fav.product_id).get();
    if (!productDoc.exists) return null;
    
    const p = productDoc.data() as Product;
    if (!p.is_active) return null;

    let category_name = undefined;
    if (p.category_id) {
      const catDoc = await db.collection("categories").doc(p.category_id).get();
      if (catDoc.exists) {
        category_name = catDoc.data()?.category_name;
      }
    }

    return { ...p, category_name, is_favorited: true } as Product;
  });

  const products = await Promise.all(productPromises);
  return products.filter((p): p is Product => p !== null);
};

export const isFavoritedRepo = async (
  userId: string,
  productId: string,
): Promise<boolean> => {
  const snapshot = await db.collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .limit(1)
    .get();

  return !snapshot.empty;
};
