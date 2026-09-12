import { db } from "../shared/config/firebase";
import { Favorite } from "../shared/types";

/**
 * Pure Database Operation: Find a favorite document by user and product ID.
 */
export const findFavoriteDb = async (
  userId: string,
  productId: string
): Promise<Favorite | null> => {
  const snapshot = await db
    .collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Favorite;
};

/**
 * Pure Database Operation: Insert a favorite document.
 */
export const insertFavoriteDb = async (favorite: Favorite): Promise<Favorite> => {
  await db.collection("favorites").doc(favorite.id).set(favorite);
  return favorite;
};

/**
 * Pure Database Operation: Delete a favorite document by user and product ID.
 */
export const deleteFavoriteDb = async (
  userId: string,
  productId: string
): Promise<void> => {
  const snapshot = await db
    .collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .get();

  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
};

/**
 * Pure Database Operation: Get all raw favorite documents for a user.
 */
export const getUserFavoritesDb = async (userId: string): Promise<Favorite[]> => {
  const snapshot = await db
    .collection("favorites")
    .where("user_id", "==", userId)
    .get();

  const favorites = snapshot.docs.map((doc) => doc.data() as Favorite);
  favorites.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return favorites;
};

/**
 * Pure Database Operation: Check if a product is favorited by a user.
 */
export const isFavoritedDb = async (
  userId: string,
  productId: string
): Promise<boolean> => {
  const snapshot = await db
    .collection("favorites")
    .where("user_id", "==", userId)
    .where("product_id", "==", productId)
    .limit(1)
    .get();

  return !snapshot.empty;
};
