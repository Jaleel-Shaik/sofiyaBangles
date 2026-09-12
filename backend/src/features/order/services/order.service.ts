import { v4 as uuidv4 } from "uuid";
import { Order, OrderItem, Review } from "../../../shared/types";
import { canTransitionOrderStatus, OrderStatus } from "../../../models/order.model";
import { Product, ProductVariant } from "../../../models/product.model";
import {
  insertOrderWithItemsDb,
  getOrderByIdDb,
  getUserOrdersDb,
  getAllAdminOrdersDb,
  getOrderItemsDb,
  updateOrderDocDb,
  getProductReviewsDb,
  insertReviewDb,
  findUserOrderItemsForProductDb,
} from "../../../db/order.db";
import { getProductByIdDb, getVariantsByProductDb } from "../../../db/product.db";
import { insertNotificationDb } from "../../../db/notification.db";
import { insertAuditLogDb } from "../../../db/audit.db";
import { createRevenueAllocationModel, createRefundReversalModel } from "../models/revenueLedger.model";

export interface CreateOrderItemInput {
  productId?: string;
  product_id?: string;
  variantId?: string | null;
  variant_id?: string | null;
  quantity: number;
  price?: number;
  product_name?: string;
  size?: string;
  image_url?: string | null;
}

export class OrderService {
  /**
   * Business Logic: Validates product & variant stock, computes line totals,
   * creates Order and OrderItem entities, and commits atomic inventory deductions via DB layer.
   */
  static async createOrder(
    userId: string,
    items: CreateOrderItemInput[],
    shippingAddressSnapshot?: any
  ): Promise<Order> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("EMPTY_ITEMS");
    }

    const now = new Date().toISOString();
    let subtotal = 0;
    const orderItems: OrderItem[] = [];
    const stockDeductions: Array<{ variantId?: string; productId: string; quantity: number }> = [];
    const orderId = uuidv4();

    for (const item of items) {
      const prodId = item.productId || item.product_id;
      if (!prodId) {
        throw new Error("PRODUCT_ID_REQUIRED");
      }
      const variantId = item.variantId || item.variant_id || null;
      const itemQuantity = Number(item.quantity) || 1;

      // Validate product existence via DB layer
      const product = await getProductByIdDb(prodId);
      if (!product || !product.is_active || product.status === "archived") {
        throw new Error(`Product ${prodId} is no longer available.`);
      }

      let unitPrice = product.price;
      let sizeSnapshot = null;

      if (product.has_variants) {
        if (!variantId) {
          throw new Error(`Variant selection required for ${product.product_name}`);
        }
        const variants = await getVariantsByProductDb(prodId);
        const variant = variants.find((v) => v.id === variantId);

        if (!variant || variant.status === "archived") {
          throw new Error(`Selected variant is no longer available.`);
        }
        if (variant.quantity < itemQuantity) {
          throw new Error(
            `Insufficient stock for ${product.product_name} (${variant.size}). Only ${variant.quantity} remaining.`
          );
        }

        unitPrice = variant.price;
        sizeSnapshot = variant.size;

        stockDeductions.push({
          variantId: variant.id,
          productId: prodId,
          quantity: itemQuantity,
        });
      } else {
        if (product.quantity < itemQuantity) {
          throw new Error(
            `Insufficient stock for ${product.product_name}. Only ${product.quantity} remaining.`
          );
        }

        stockDeductions.push({
          productId: prodId,
          quantity: itemQuantity,
        });
      }

      const itemSubtotal = unitPrice * itemQuantity;
      subtotal += itemSubtotal;

      orderItems.push({
        id: uuidv4(),
        order_id: orderId,
        product_id: prodId,
        variant_id: variantId,
        product_name_snapshot: product.product_name,
        category_name_snapshot: product.category_name,
        category_id: product.category_id,
        size_snapshot: sizeSnapshot,
        price_snapshot: unitPrice,
        quantity: itemQuantity,
        subtotal: itemSubtotal,
        created_at: now,
      });
    }

    const shippingFee = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + shippingFee - discountAmount;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const orderData: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      status: "pending",
      payment_status: "pending",
      subtotal,
      shipping_fee: shippingFee,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      shipping_address_snapshot: shippingAddressSnapshot || {
        name: "Valued Customer",
        phone: "",
        address_line1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
      },
      notes: null,
      created_at: now,
      updated_at: now,
    };

    // Commit atomically via DB Layer
    await insertOrderWithItemsDb(orderData, orderItems, stockDeductions);

    // Audit trail
    await insertAuditLogDb({
      actor_id: userId,
      user_type: "user",
      action: "ORDER_CREATED",
      table_name: "orders",
      record_id: orderId,
      new_data: { order_number: orderNumber, total_amount: totalAmount, items_count: orderItems.length },
    });

    return { ...orderData, items: orderItems };
  }

  /**
   * Business Logic: Retrieves user's orders with item snapshots.
   */
  static async getUserOrders(userId: string): Promise<Order[]> {
    const orders = await getUserOrdersDb(userId);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await getOrderItemsDb(order.id);
        return { ...order, items };
      })
    );
    return ordersWithItems;
  }

  /**
   * Business Logic: Retrieves a single order by ID with its items.
   */
  static async getOrderById(orderId: string, requestingUserId?: string, userRole?: string): Promise<Order> {
    const order = await getOrderByIdDb(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (userRole !== "admin" && userRole !== "super_admin" && requestingUserId && order.user_id !== requestingUserId) {
      throw new Error("UNAUTHORIZED_ACCESS");
    }

    const items = await getOrderItemsDb(orderId);
    return { ...order, items };
  }

  /**
   * Business Logic: Retrieves all orders for admin.
   */
  static async getAllAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    const result = await getAllAdminOrdersDb(params);
    const ordersWithItems = await Promise.all(
      result.orders.map(async (order) => {
        const items = await getOrderItemsDb(order.id);
        return { ...order, items };
      })
    );

    return {
      orders: ordersWithItems,
      total: result.total,
    };
  }

  /**
   * Business Logic: Completes order, generates revenue allocations (70/30),
   * creates SuperAdmin notification, and records audit logs.
   */
  static async completeOrder(orderId: string, actorId: string): Promise<Order> {
    const order = await getOrderByIdDb(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status === "completed" && order.payment_status === "paid") {
      return order;
    }

    const now = new Date().toISOString();
    await updateOrderDocDb(orderId, {
      status: "completed",
      payment_status: "paid",
      updated_at: now,
    });

    const items = await getOrderItemsDb(orderId);
    for (const item of items) {
      await createRevenueAllocationModel({
        orderId: order.id,
        orderItemId: item.id,
        productId: item.product_id,
        grossAmount: item.subtotal || item.price_snapshot * item.quantity,
        transactionType: "SALE",
        notes: `Sale completed for ${item.product_name_snapshot}`,
      });
    }

    // Side-effects: SuperAdmin Notification via DB layer
    const notifId = uuidv4();
    await insertNotificationDb({
      id: notifId,
      title: `New Sale Completed: ${order.order_number}`,
      body: `Order ${order.order_number} for ₹${order.total_amount} was completed successfully.`,
      type: "NEW_SALE",
      product_id: null,
      sent_by: actorId,
      user_id: null,
      is_read: false,
      created_at: now,
    });

    // Side-effects: Audit Logging via DB layer
    await insertAuditLogDb({
      actor_id: actorId,
      action: "ORDER_COMPLETED",
      table_name: "orders",
      record_id: orderId,
      old_data: { status: order.status, payment_status: order.payment_status },
      new_data: { status: "completed", payment_status: "paid" },
    });

    await insertAuditLogDb({
      actor_id: actorId,
      action: "REVENUE_ALLOCATED",
      table_name: "revenue_ledger",
      record_id: orderId,
      new_data: { order_number: order.order_number, total_amount: order.total_amount },
    });

    return {
      ...order,
      status: "completed",
      payment_status: "paid",
      updated_at: now,
    };
  }

  /**
   * Business Logic: Refunds an order, reverses revenue ledger,
   * emits notifications, and logs audit events.
   */
  static async refundOrder(orderId: string, actorId: string, reason?: string): Promise<Order> {
    const order = await getOrderByIdDb(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.payment_status === "refunded") {
      return order;
    }

    const now = new Date().toISOString();
    await updateOrderDocDb(orderId, {
      status: "returned",
      payment_status: "refunded",
      updated_at: now,
    });

    await createRefundReversalModel(orderId, reason);

    const notifId = uuidv4();
    await insertNotificationDb({
      id: notifId,
      title: `Order Refunded: ${order.order_number}`,
      body: `Refund processed for order ${order.order_number} (₹${order.total_amount}). Reason: ${reason || "N/A"}.`,
      type: "REFUND",
      product_id: null,
      sent_by: actorId,
      user_id: null,
      is_read: false,
      created_at: now,
    });

    await insertAuditLogDb({
      actor_id: actorId,
      action: "ORDER_REFUNDED",
      table_name: "orders",
      record_id: orderId,
      old_data: { status: order.status, payment_status: order.payment_status },
      new_data: { status: "returned", payment_status: "refunded", reason },
    });

    return {
      ...order,
      status: "returned",
      payment_status: "refunded",
      updated_at: now,
    };
  }

  /**
   * Business Logic: Validates order state transitions and coordinates completions/refunds.
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    actorId: string,
    notes?: string
  ): Promise<Order> {
    const order = await getOrderByIdDb(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (newStatus === "completed") {
      return await OrderService.completeOrder(orderId, actorId);
    }
    if (newStatus === "returned" || newStatus === "cancelled") {
      if (order.payment_status === "paid") {
        return await OrderService.refundOrder(orderId, actorId, notes || "Order cancelled");
      }
    }

    if (!canTransitionOrderStatus(order.status, newStatus as any)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    const now = new Date().toISOString();
    await updateOrderDocDb(orderId, {
      status: newStatus as any,
      updated_at: now,
    });

    // Notify user of status update
    const notifId = uuidv4();
    await insertNotificationDb({
      id: notifId,
      title: `Order Status Updated: ${newStatus.toUpperCase()}`,
      body: `Your order ${order.order_number} is now ${newStatus}.`,
      type: "ORDER_STATUS",
      product_id: null,
      sent_by: actorId,
      user_id: order.user_id,
      is_read: false,
      created_at: now,
    });

    await insertAuditLogDb({
      actor_id: actorId,
      action: "ORDER_STATUS_UPDATED",
      table_name: "orders",
      record_id: orderId,
      old_data: { status: order.status },
      new_data: { status: newStatus, notes },
    });

    return {
      ...order,
      status: newStatus as any,
      updated_at: now,
    };
  }

  /**
   * Business Logic: Verifies product purchase prior to review insertion.
   */
  static async createReview(
    userId: string,
    data: { productId: string; rating: number; comment?: string; customerName?: string }
  ): Promise<Review> {
    const { productId, rating, comment, customerName } = data;

    const completedItems = await findUserOrderItemsForProductDb(userId, productId);
    if (completedItems.length === 0) {
      throw new Error("CANNOT_REVIEW_UNPURCHASED_PRODUCT");
    }

    const now = new Date().toISOString();

    const review: Review = {
      id: uuidv4(),
      user_id: userId,
      product_id: productId,
      rating,
      comment: comment || null,
      damage_details: null,
      created_at: now,
      updated_at: now,
    };

    return await insertReviewDb(review);
  }

  /**
   * Business Logic: Retrieves reviews for a product.
   */
  static async getProductReviews(productId: string): Promise<Review[]> {
    return await getProductReviewsDb(productId);
  }
}
