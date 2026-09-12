import {
  Order,
  OrderItem,
  Address as ShippingAddress,
  Review,
} from "../shared/types";

export { Order, OrderItem, ShippingAddress, Review };

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "return_requested"
  | "returned";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

/**
 * Domain Constraints for Orders
 */
export const ORDER_CONSTRAINTS = {
  ALLOWED_STATUSES: [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
    "return_requested",
    "returned",
  ] as const,
  ALLOWED_PAYMENT_STATUSES: ["pending", "paid", "failed", "refunded", "partially_refunded"] as const,
  MIN_ORDER_AMOUNT: 0,
};

/**
 * State Machine Transition Constraints: specifies allowed transitions between order states.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "confirmed", "cancelled"],
  processing: ["confirmed", "shipped", "cancelled"],
  confirmed: ["shipped", "out_for_delivery", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "completed", "returned"],
  out_for_delivery: ["delivered", "completed", "returned"],
  delivered: ["completed", "return_requested", "returned"],
  completed: ["return_requested", "returned"],
  cancelled: [],
  return_requested: ["returned", "completed"],
  returned: [],
};

export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};
