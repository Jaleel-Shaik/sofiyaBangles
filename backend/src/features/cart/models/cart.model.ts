/**
 * Feature Model: Cart
 * Re-exports pure data models from src/models/cart.model
 * Re-exports database operations from src/db/cart.db for backward-compatible module resolution.
 */

export * from "../../../models/cart.model";
import {
  getCartByUserIdDb,
  insertCartDb,
  getCartItemsDb,
  upsertCartItemDb,
  deleteCartItemDb,
  clearCartItemsDb,
} from "../../../db/cart.db";

export {
  getCartByUserIdDb as getCartByUserIdModel,
  insertCartDb as createCartModel,
  getCartItemsDb as getCartItemsModel,
  upsertCartItemDb as upsertCartItemModel,
  deleteCartItemDb as removeCartItemModel,
  clearCartItemsDb as clearCartModel,
};
