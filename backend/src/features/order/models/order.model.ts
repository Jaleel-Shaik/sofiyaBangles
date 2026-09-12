/**
 * Feature Model: Order
 * Re-exports pure data models, entity interfaces, and constraints from src/models/order.model
 * Re-exports database operations from src/db/order.db for backward-compatible module resolution.
 */

export * from "../../../models/order.model";
export {
  insertOrderWithItemsDb as insertOrderWithItemsModel,
  getOrderByIdDb as getOrderByIdModel,
  getUserOrdersDb as getUserOrdersModel,
  getAllAdminOrdersDb as getAllAdminOrdersModel,
  getOrderItemsDb as getOrderItemsModel,
  updateOrderDocDb as updateOrderDocModel,
  getProductReviewsDb as getProductReviewsModel,
  insertReviewDb as insertReviewModel,
  findUserOrderItemsForProductDb as findUserOrderItemsForProductModel,
} from "../../../db/order.db";

export interface StockDeduction {
  type: "variant" | "product";
  id: string;
  quantity: number;
}
