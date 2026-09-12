import {
  getCartByUserIdDb,
  insertCartDb,
  getCartItemsDb,
  upsertCartItemDb,
  deleteCartItemDb,
  clearCartItemsDb,
} from "../../../db/cart.db";
import { getProductByIdDb, getVariantsByProductDb } from "../../../db/product.db";
import { Cart, CartItem } from "../../../models/cart.model";
import { NotFoundError, BadRequestError } from "../../../core/errors/app.error";
import { UpsertCartItemInput } from "../validations/cart.validation";

export interface EnrichedCartItem extends CartItem {
  product_name?: string;
  price?: number;
  image_url?: string | null;
  size?: string;
}

export class CartService {
  static async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await getCartByUserIdDb(userId);
    if (!cart) {
      cart = await insertCartDb(userId);
    }
    return cart;
  }

  static async getUserCart(userId: string): Promise<{ cart: Cart; items: EnrichedCartItem[] }> {
    const cart = await this.getOrCreateCart(userId);
    const rawItems = await getCartItemsDb(cart.id);

    const enrichedItems: EnrichedCartItem[] = await Promise.all(
      rawItems.map(async (item) => {
        const product = await getProductByIdDb(item.product_id);
        let productName = product?.product_name || "Unknown Product";
        let price = product?.price || 0;
        let imageUrl = product?.images?.[0]?.image_url || null;
        let size: string | undefined = undefined;

        if (item.variant_id && product?.has_variants) {
          const variants = await getVariantsByProductDb(item.product_id);
          const variant = variants.find((v) => v.id === item.variant_id);
          if (variant) {
            price = variant.price;
            size = variant.size;
          }
        }

        return {
          ...item,
          product_name: productName,
          price,
          image_url: imageUrl,
          size,
        };
      })
    );

    return { cart, items: enrichedItems };
  }

  static async addItem(userId: string, input: UpsertCartItemInput): Promise<CartItem> {
    const product = await getProductByIdDb(input.product_id);
    if (!product || !product.is_active) {
      throw new NotFoundError("Product not found or unavailable.");
    }

    if (input.variant_id) {
      const variants = await getVariantsByProductDb(input.product_id);
      const variant = variants.find((v) => v.id === input.variant_id);
      if (!variant) {
        throw new NotFoundError("Selected product variant not found.");
      }
      if (variant.quantity < input.quantity) {
        throw new BadRequestError(`Insufficient stock for variant. Available: ${variant.quantity}`);
      }
    } else if (product.quantity < input.quantity) {
      throw new BadRequestError(`Insufficient stock for product. Available: ${product.quantity}`);
    }

    const cart = await this.getOrCreateCart(userId);
    return upsertCartItemDb(
      cart.id,
      input.product_id,
      input.variant_id || null,
      input.quantity
    );
  }

  static async removeItem(userId: string, cartItemId: string): Promise<void> {
    await this.getOrCreateCart(userId);
    await deleteCartItemDb(cartItemId);
  }

  static async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await clearCartItemsDb(cart.id);
  }
}
