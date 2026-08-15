import { db } from "../../../shared/config/firebase";
import { Cart, CartItem } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

export const getCartByUserIdModel = async (userId: string): Promise<Cart | null> => {
  const snapshot = await db
    .collection("carts")
    .where("user_id", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Cart;
};

export const createCartModel = async (userId: string): Promise<Cart> => {
  const now = new Date().toISOString();
  const cart: Cart = {
    id: uuidv4(),
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
  await db.collection("carts").doc(cart.id).set(cart);
  return cart;
};

export const getCartItemsModel = async (cartId: string): Promise<CartItem[]> => {
  const snapshot = await db
    .collection("cart_items")
    .where("cart_id", "==", cartId)
    .get();

  return snapshot.docs.map((doc) => doc.data() as CartItem);
};

export const upsertCartItemModel = async (
  cartId: string,
  productId: string,
  variantId: string | null,
  quantity: number
): Promise<CartItem> => {
  const snapshot = await db
    .collection("cart_items")
    .where("cart_id", "==", cartId)
    .where("product_id", "==", productId)
    .where("variant_id", "==", variantId)
    .limit(1)
    .get();

  const now = new Date().toISOString();

  if (!snapshot.empty) {
    const existing = snapshot.docs[0].data() as CartItem;
    const updatedQuantity = existing.quantity + quantity;
    
    await db.collection("cart_items").doc(existing.id).update({
      quantity: updatedQuantity,
      updated_at: now
    });
    
    return { ...existing, quantity: updatedQuantity, updated_at: now };
  } else {
    const id = uuidv4();
    const cartItem: CartItem = {
      id,
      cart_id: cartId,
      product_id: productId,
      variant_id: variantId,
      quantity,
      created_at: now,
      updated_at: now
    };
    await db.collection("cart_items").doc(id).set(cartItem);
    return cartItem;
  }
};

export const removeCartItemModel = async (cartItemId: string): Promise<void> => {
  await db.collection("cart_items").doc(cartItemId).delete();
};

export const clearCartModel = async (cartId: string): Promise<void> => {
  const snapshot = await db
    .collection("cart_items")
    .where("cart_id", "==", cartId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};
