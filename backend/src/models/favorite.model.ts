/**
 * Pure Model Layer: Favorite Entity and Interfaces.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}
