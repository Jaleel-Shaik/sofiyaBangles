import { Cart, CartItem } from "../shared/types";

export { Cart, CartItem };

export const CART_CONSTRAINTS = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 999,
} as const;

export function validateCartItemQuantity(quantity: number): boolean {
  return (
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= CART_CONSTRAINTS.MIN_QUANTITY &&
    quantity <= CART_CONSTRAINTS.MAX_QUANTITY
  );
}
