import {
  createOrderModel,
  getUserOrdersModel,
  getOrderItemsModel,
  createReviewModel,
  getProductReviewsModel,
  completeOrderModel,
  refundOrderModel,
  getAllAdminOrdersModel,
  updateOrderStatusModel,
} from "../models/order.model";

export class OrderService {
  static async createOrder(userId: string, items: any[], shippingAddressSnapshot?: any) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("EMPTY_ITEMS");
    }
    return await createOrderModel({ userId, items, shippingAddressSnapshot });
  }

  static async getUserOrders(userId: string) {
    const orders = await getUserOrdersModel(userId);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await getOrderItemsModel(order.id);
        return { ...order, items };
      })
    );
    return ordersWithItems;
  }

  static async getAdminOrders(params: { page: number; limit: number; status?: string; search?: string }) {
    const result = await getAllAdminOrdersModel(params);
    const ordersWithItems = await Promise.all(
      result.orders.map(async (order) => {
        const items = await getOrderItemsModel(order.id);
        const address = order.shipping_address_snapshot as any;
        const customer_name = address?.full_name || address?.name || "Customer";
        const customer_phone = address?.phone || "";
        const customer_email = address?.email || "";
        return {
          ...order,
          items,
          customer_name,
          customer_phone,
          customer_email,
        };
      })
    );

    return {
      orders: ordersWithItems,
      total: result.total,
    };
  }

  static async completeOrder(id: string, adminId: string) {
    return await completeOrderModel(id, adminId);
  }

  static async refundOrder(id: string, adminId: string, reason?: string) {
    return await refundOrderModel(id, adminId, reason);
  }

  static async updateOrderStatus(id: string, adminId: string, status: string, notes?: string) {
    if (!status) {
      throw new Error("MISSING_STATUS");
    }
    return await updateOrderStatusModel(id, adminId, status, notes);
  }

  static async createReview(userId: string, productId: string, rating: number, comment?: string, damageDetails?: string) {
    return await createReviewModel({
      userId,
      productId,
      rating,
      comment,
      damageDetails,
    });
  }

  static async getProductReviews(productId: string) {
    return await getProductReviewsModel(productId);
  }
}
