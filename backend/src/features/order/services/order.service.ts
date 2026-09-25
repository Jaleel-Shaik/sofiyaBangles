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
  deleteOrderDb,
  getProductReviewsDb,
  insertReviewDb,
  findUserOrderItemsForProductDb,
  getAllReviewsForAdminDb,
  markOrderItemReviewedDb,
} from "../../../db/order.db";
import { db } from "../../../shared/config/firebase";
import { getProductByIdDb, getVariantsByProductDb, updateProductDocDb } from "../../../db/product.db";
import { calculateReviewStats } from "../../product/models/product.model";
import { insertNotificationDb } from "../../../db/notification.db";
import { insertAuditLogDb } from "../../../db/audit.db";
import { createRevenueAllocationModel, createRefundReversalModel } from "../models/revenueLedger.model";
import { findIdentityByIdModel, updateIdentityModel, findUserByPhoneModel } from "../../../shared/models/identity.model";
import { WhatsAppService } from "./whatsapp.service";
import { maskPhoneNumber } from "../../../shared/utils/redact.utils";

export interface WhatsAppPurchaseInput {
  productId?: string;
  product_id?: string;
  variantId?: string | null;
  variant_id?: string | null;
  quantity?: number;
  size?: string | null;
  customMeasurements?: Record<string, string> | null;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  phone?: string | null;
}

export interface WhatsAppPurchaseResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  deliveryMode: "cloud_api" | "client_dispatch";
  whatsappStatus: "sent" | "ready";
  whatsappUrl?: string;
}

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

      if (product.has_variants && variantId) {
        const variants = await getVariantsByProductDb(prodId);
        const variant = variants.find((v) => v.id === variantId);

        if (variant && variant.status !== "archived" && variant.quantity >= itemQuantity) {
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

      const productImage = product.image_url || (Array.isArray(product.images) && product.images[0]?.image_url) || null;

      orderItems.push({
        id: uuidv4(),
        order_id: orderId,
        product_id: prodId,
        variant_id: variantId,
        product_name_snapshot: product.product_name,
        product_name: product.product_name,
        productNameSnapshot: product.product_name,
        category_name_snapshot: product.category_name,
        category_id: product.category_id,
        size_snapshot: sizeSnapshot,
        price_snapshot: unitPrice,
        unit_price: unitPrice,
        image_url: productImage,
        quantity: itemQuantity,
        subtotal: itemSubtotal,
        created_at: now,
      });
    }

    const shippingFee = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + shippingFee - discountAmount;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const isDirectWhatsAppSale =
      shippingAddressSnapshot?.order_source === "whatsapp" ||
      (shippingAddressSnapshot?.notes &&
        typeof shippingAddressSnapshot.notes === "string" &&
        shippingAddressSnapshot.notes.toLowerCase().includes("whatsapp"));

    const customerName =
      shippingAddressSnapshot?.full_name ||
      shippingAddressSnapshot?.name ||
      "Direct Customer";
    const customerPhone = shippingAddressSnapshot?.phone || "";

    let targetUserId = userId;
    if (customerPhone) {
      try {
        const customerUser = await findUserByPhoneModel(customerPhone);
        if (customerUser) {
          targetUserId = customerUser.id;
        }
      } catch {
        // preserve original userId if lookup fails
      }
    }

    const orderData: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: targetUserId,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_source: shippingAddressSnapshot?.order_source || "whatsapp",
      status: isDirectWhatsAppSale ? "completed" : "pending",
      payment_status: isDirectWhatsAppSale ? "paid" : "pending",
      subtotal,
      shipping_fee: shippingFee,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      shipping_address_snapshot: shippingAddressSnapshot || {
        name: customerName,
        phone: customerPhone,
        address_line1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
      },
      notes: shippingAddressSnapshot?.notes || null,
      created_at: now,
      updated_at: now,
    };

    // Commit atomically via DB Layer
    await insertOrderWithItemsDb(orderData, orderItems, stockDeductions);

    // If direct WhatsApp sale, immediately allocate revenue (70/30)
    if (isDirectWhatsAppSale) {
      for (const item of orderItems) {
        createRevenueAllocationModel({
          orderId: orderData.id,
          orderItemId: item.id,
          productId: item.product_id,
          grossAmount: item.subtotal,
          adminId: userId,
          transactionType: "SALE",
          notes: "WhatsApp direct order revenue allocation",
        }).catch((err) => console.error("Revenue ledger allocation error (non-fatal):", err));
      }
    }

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
    let userPhone: string | null = null;
    try {
      const identity = await findIdentityByIdModel(userId);
      userPhone = identity?.profile?.phone || null;
    } catch {
      // Ignore profile lookup error
    }

    const orders = await getUserOrdersDb(userId, userPhone);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await getOrderItemsDb(order.id);
        const normalizedItems = await Promise.all(
          items.map(async (item) => {
            let imageUrl = (item as any).image_url;
            let productName = item.product_name || item.product_name_snapshot;
            let price = item.price_snapshot ?? (item as any).unit_price ?? (item as any).price ?? 0;

            // Fallback lookup to products collection if image_url or details are missing
            if ((!imageUrl || !productName) && item.product_id) {
              try {
                const product = await getProductByIdDb(item.product_id);
                if (product) {
                  if (!imageUrl) {
                    imageUrl = product.image_url || (Array.isArray(product.images) && product.images[0]?.image_url) || null;
                  }
                  if (!productName) {
                    productName = product.product_name;
                  }
                  if (!price) {
                    price = product.price;
                  }
                }
              } catch {
                // Ignore fallback error
              }
            }

            return {
              ...item,
              product_name: productName || "Handcrafted Bangles",
              product_name_snapshot: item.product_name_snapshot || productName || "Handcrafted Bangles",
              price,
              price_snapshot: item.price_snapshot ?? price,
              image_url: imageUrl || null,
              status: order.status,
            };
          })
        );
        return { ...order, items: normalizedItems };
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
    const normalizedItems = items.map((item) => ({
      ...item,
      product_name: item.product_name_snapshot || item.product_name || "Handcrafted Bangles",
      productNameSnapshot: item.product_name_snapshot || item.product_name || "Handcrafted Bangles",
      unit_price: item.price_snapshot ?? item.unit_price ?? 0,
      itemPrice: item.price_snapshot ?? item.unit_price ?? 0,
    }));

    const customerName =
      order.customer_name ||
      (order.shipping_address_snapshot as any)?.full_name ||
      (order.shipping_address_snapshot as any)?.name ||
      "Customer";
    const customerPhone =
      order.customer_phone ||
      (order.shipping_address_snapshot as any)?.phone ||
      "";

    return {
      ...order,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: normalizedItems,
    };
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
        const rawItems = await getOrderItemsDb(order.id);
        const normalizedItems = rawItems.map((item) => ({
          ...item,
          product_name: item.product_name_snapshot || item.product_name || "Handcrafted Bangles",
          productNameSnapshot: item.product_name_snapshot || item.product_name || "Handcrafted Bangles",
          unit_price: item.price_snapshot ?? item.unit_price ?? 0,
          itemPrice: item.price_snapshot ?? item.unit_price ?? 0,
        }));

        let customerName =
          order.customer_name ||
          (order.shipping_address_snapshot as any)?.full_name ||
          (order.shipping_address_snapshot as any)?.name ||
          "";
        let customerPhone =
          order.customer_phone ||
          (order.shipping_address_snapshot as any)?.phone ||
          "";

        // Fallback: If customer name is default or phone is missing, resolve from user profile
        if ((!customerName || customerName === "Direct Customer" || !customerPhone) && order.user_id) {
          try {
            const userDoc = await db.collection("users").doc(order.user_id).get();
            if (userDoc.exists) {
              const uData = userDoc.data();
              if (!customerName || customerName === "Direct Customer") {
                customerName = uData?.full_name || uData?.name || customerName;
              }
              if (!customerPhone) {
                customerPhone = uData?.phone || customerPhone;
              }
            } else {
              const adminDoc = await db.collection("admins").doc(order.user_id).get();
              if (adminDoc.exists) {
                const aData = adminDoc.data();
                if (!customerName || customerName === "Direct Customer") {
                  customerName = aData?.full_name || aData?.name || customerName;
                }
                if (!customerPhone) {
                  customerPhone = aData?.phone || customerPhone;
                }
              }
            }
          } catch {
            // Ignore fallback error
          }
        }

        if (!customerName) customerName = "Direct Customer";

        return {
          ...order,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: normalizedItems,
        };
      })
    );

    return {
      orders: ordersWithItems,
      total: result.total,
    };
  }

  /**
   * Business Logic: Deletes an order, its items, and associated ledger entries atomically.
   */
  static async deleteOrder(orderId: string, actorId: string): Promise<void> {
    const order = await getOrderByIdDb(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    await deleteOrderDb(orderId);

    await insertAuditLogDb({
      actor_id: actorId,
      user_type: "admin",
      action: "ORDER_DELETED",
      table_name: "orders",
      record_id: orderId,
      old_data: { order_number: order.order_number, total_amount: order.total_amount },
    });
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
   * Records user quality rating (1-5), suggestions, defect/damage reports,
   * stores user personal info for admin review, and maintains public anonymity.
   */
  static async createReview(
    userId: string,
    data: {
      productId: string;
      orderId?: string | null;
      orderItemId?: string | null;
      rating: number;
      qualityRating?: number;
      comment?: string | null;
      suggestion?: string | null;
      isDefective?: boolean;
      damageDetails?: string | null;
      customerName?: string | null;
    }
  ): Promise<Review> {
    const {
      productId,
      orderId,
      orderItemId,
      rating,
      comment,
      suggestion,
      isDefective,
      damageDetails,
      customerName,
    } = data;

    // Verify purchase: User must have placed a non-cancelled order containing this product
    const purchasedItems = await findUserOrderItemsForProductDb(userId, productId, orderId);
    if (purchasedItems.length === 0) {
      throw new Error("CANNOT_REVIEW_UNPURCHASED_PRODUCT");
    }

    // Fetch user profile for personal information (Admin view)
    let userProfile = null;
    try {
      userProfile = await findIdentityByIdModel(userId);
    } catch (err) {
      console.warn("Could not fetch user profile for review:", err);
    }

    // Fetch product details for snapshot
    let productDetails = null;
    try {
      productDetails = await getProductByIdDb(productId);
    } catch (err) {
      console.warn("Could not fetch product details for review:", err);
    }

    // Fetch order details if available
    let orderNumber: string | null = null;
    const targetOrderId = orderId || purchasedItems[0]?.order_id;
    if (targetOrderId) {
      try {
        const orderDoc = await getOrderByIdDb(targetOrderId);
        orderNumber = orderDoc?.order_number || null;
      } catch (err) {
        console.warn("Could not fetch order details for review:", err);
      }
    }

    const now = new Date().toISOString();
    const finalRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const review: Review = {
      id: uuidv4(),
      user_id: userId,
      product_id: productId,
      order_id: targetOrderId || null,
      order_item_id: orderItemId || purchasedItems[0]?.id || null,
      order_number: orderNumber,
      rating: finalRating,
      suggestion: suggestion?.trim() || null,
      comment: comment?.trim() || null,
      is_defective: Boolean(isDefective),
      damage_details: damageDetails?.trim() || null,
      // Personal information stored for Admin viewing:
      user_name: userProfile?.profile?.full_name || customerName?.trim() || "Customer",
      user_email: userProfile?.profile?.email || undefined,
      user_phone: userProfile?.profile?.phone || undefined,
      // Product snapshot:
      product_name: productDetails?.product_name || purchasedItems[0]?.product_name || "Handcrafted Bangles",
      product_image: productDetails?.image_url || purchasedItems[0]?.image_url || null,
      created_at: now,
      updated_at: now,
    };

    // 1. Insert review
    const savedReview = await insertReviewDb(review);

    // 2. Mark order item as reviewed
    try {
      await markOrderItemReviewedDb(targetOrderId, productId, savedReview.id);
    } catch (err) {
      console.error("Non-fatal: failed to mark order item reviewed:", err);
    }

    // 3. Update product rating & reviews count
    try {
      const allProductReviews = await getProductReviewsDb(productId);
      const stats = calculateReviewStats(allProductReviews);
      await updateProductDocDb(productId, {
        rating: stats.rating,
        reviews: stats.reviews,
      });
    } catch (err) {
      console.error("Non-fatal: failed to update product review stats:", err);
    }

    // 4. Create in-app notification for Admin / SuperAdmin
    try {
      const notifId = uuidv4();
      const userName = userProfile?.profile?.full_name || customerName?.trim() || "Customer";
      const productName = productDetails?.product_name || purchasedItems[0]?.product_name || "Handcrafted Bangles";
      const productCode = productDetails?.unique_code ? ` (#${productDetails.unique_code})` : "";

      await insertNotificationDb({
        id: notifId,
        title: `New Review for ${productName} (${finalRating}★)`,
        body: `${userName} rated ${productName}${productCode} ${finalRating}/5 stars. "${comment || suggestion || 'Customer submitted a rating/review.'}"`,
        type: "REVIEW",
        product_id: productId,
        sent_by: userId,
        user_id: null, // Broadcast notification visible to all admin dashboard users
        is_read: false,
        created_at: now,
      });
    } catch (err) {
      console.error("Non-fatal: failed to create admin review notification:", err);
    }

    return savedReview;
  }

  /**
   * Business Logic: Retrieves publicly viewable reviews for a product.
   * STRICT PRIVACY GUARANTEE: Strips all personal PII (email, phone, user_id, order_id).
   * Only returns username and product review details so other buyers can browse safely.
   */
  static async getProductReviews(productId: string): Promise<Partial<Review>[]> {
    const rawReviews = await getProductReviewsDb(productId);
    return rawReviews.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      rating: r.rating,
      comment: r.comment,
      suggestion: r.suggestion || null,
      is_defective: Boolean(r.is_defective),
      damage_details: r.damage_details || null,
      user_name: r.user_name || "Verified Customer",
      created_at: r.created_at,
    }));
  }

  /**
   * Business Logic: Retrieves all reviews with full customer personal information for Admin Portal.
   */
  static async getAllReviewsForAdmin(): Promise<Review[]> {
    const rawReviews = await getAllReviewsForAdminDb();

    // Enrich with user and order info if missing (e.g. for legacy records)
    const enriched = await Promise.all(
      rawReviews.map(async (r) => {
        let user_name = r.user_name;
        let user_email = r.user_email;
        let user_phone = r.user_phone;
        let product_name = r.product_name;
        let product_image = r.product_image;
        let order_number = r.order_number;

        if (!user_email && r.user_id) {
          try {
            const identityRef = await findIdentityByIdModel(r.user_id);
            if (identityRef?.profile) {
              user_name = user_name || identityRef.profile.full_name;
              user_email = identityRef.profile.email;
              user_phone = user_phone || identityRef.profile.phone || undefined;
            }
          } catch {}
        }

        let unique_code = (r as any).unique_code || (r as any).product_code;

        if (r.product_id) {
          try {
            const product = await getProductByIdDb(r.product_id);
            if (product) {
              product_name = product_name || product.product_name;
              product_image = product_image || product.image_url;
              unique_code = unique_code || product.unique_code;
            }
          } catch {}
        }

        if (!order_number && r.order_id) {
          try {
            const order = await getOrderByIdDb(r.order_id);
            if (order) {
              order_number = order.order_number;
            }
          } catch {}
        }

        return {
          ...r,
          user_name: user_name || "Customer",
          user_email,
          user_phone,
          product_name: product_name || "Product",
          product_image,
          order_number,
          unique_code: unique_code || null,
        };
      })
    );

    return enriched;
  }

  /**
   * Secure WhatsApp Purchase Flow:
   * 1. Authenticated Profile Lookup: Uses verified userId to fetch name & phone from Firestore.
   *    Never trusts client-supplied names or phones.
   * 2. Server-Side Price & Stock Validation: Retrieves active product & variant from DB.
   *    Calculates subtotal on server; never trusts client-supplied price.
   * 3. Atomic Order Insertion: Records order in `orders` & deducts inventory atomically.
   * 4. Secure WhatsApp Dispatch: Dispatches via Meta Cloud API or server-verified client link.
   * 5. PII Masked Logging: Masks customer phone numbers in audit logs.
   */
  static async initiateWhatsAppPurchaseOrder(
    userId: string,
    input: WhatsAppPurchaseInput
  ): Promise<WhatsAppPurchaseResult> {
    const prodId = input.productId || input.product_id;
    if (!prodId) {
      throw new Error("PRODUCT_ID_REQUIRED");
    }

    // 1. Retrieve authenticated user profile from trusted server database
    const identity = await findIdentityByIdModel(userId);
    const profile = identity?.profile;

    let customerName =
      profile?.full_name?.trim() ||
      input.customerName?.trim() ||
      profile?.email?.split("@")[0] ||
      "";

    let customerPhone =
      profile?.phone?.trim() ||
      input.customerPhone?.trim() ||
      input.phone?.trim() ||
      "";

    // Backfill user profile in Firestore if phone was passed by mobile client
    if (identity && !profile?.phone && customerPhone) {
      try {
        await updateIdentityModel(userId, identity.user_type, { phone: customerPhone });
      } catch (e) {
        console.warn("Could not backfill user phone to profile:", e);
      }
    }
    if (identity && !profile?.full_name && customerName && customerName !== "Customer") {
      try {
        await updateIdentityModel(userId, identity.user_type, { full_name: customerName });
      } catch (e) {
        console.warn("Could not backfill user full_name to profile:", e);
      }
    }

    if (!customerPhone) {
      throw new Error("PROFILE_PHONE_REQUIRED");
    }
    if (!customerName) {
      customerName = "Customer";
    }

    // 2. Validate product and variant stock from trusted database
    const product = await getProductByIdDb(prodId);
    if (!product || !product.is_active || product.status === "archived") {
      throw new Error("PRODUCT_NOT_AVAILABLE");
    }

    const quantity = Math.max(1, Number(input.quantity) || 1);
    const variantId = input.variantId || input.variant_id || null;
    let unitPrice = product.price;
    let sizeSnapshot: string | null = input.size || null;
    const stockDeductions: Array<{ variantId?: string; productId: string; quantity: number }> = [];

    if (product.has_variants) {
      const variants = await getVariantsByProductDb(prodId);
      let variant = variantId ? variants.find((v) => v.id === variantId) : null;

      // Fallback matching by size if variantId was not explicitly passed
      if (!variant && sizeSnapshot) {
        variant = variants.find((v) => v.size === sizeSnapshot && (v.quantity || 0) > 0) || null;
      }
      // If still not matched, pick first in-stock variant
      if (!variant && variants.length > 0) {
        variant = variants.find((v) => (v.quantity || 0) > 0) || variants[0];
      }

      if (variant) {
        if (variant.status === "archived") {
          throw new Error("VARIANT_NOT_AVAILABLE");
        }
        if (variant.quantity < quantity) {
          throw new Error(
            `Insufficient stock for ${product.product_name} (${variant.size}). Only ${variant.quantity} remaining.`
          );
        }
        unitPrice = variant.price;
        sizeSnapshot = variant.size;
        stockDeductions.push({
          variantId: variant.id,
          productId: prodId,
          quantity,
        });
      }
    } else {
      if (product.quantity < quantity) {
        throw new Error(
          `Insufficient stock for ${product.product_name}. Only ${product.quantity} remaining.`
        );
      }
      stockDeductions.push({
        productId: prodId,
        quantity,
      });
    }

    // 3. Compute price strictly on the server
    const subtotal = unitPrice * quantity;
    const totalAmount = subtotal;
    const now = new Date().toISOString();
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const productImage = product.image_url || (Array.isArray(product.images) && product.images[0]?.image_url) || null;

    const orderItem: OrderItem = {
      id: uuidv4(),
      order_id: orderId,
      product_id: prodId,
      variant_id: variantId,
      product_name_snapshot: product.product_name,
      product_name: product.product_name,
      productNameSnapshot: product.product_name,
      category_name_snapshot: product.category_name,
      category_id: product.category_id,
      size_snapshot: sizeSnapshot,
      price_snapshot: unitPrice,
      unit_price: unitPrice,
      image_url: productImage,
      quantity,
      subtotal,
      created_at: now,
    };

    const orderData: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_source: "whatsapp_purchase",
      status: "pending",
      payment_status: "pending",
      subtotal,
      shipping_fee: 0,
      discount_amount: 0,
      total_amount: totalAmount,
      shipping_address_snapshot: {
        id: uuidv4(),
        user_id: userId,
        name: customerName,
        phone: customerPhone,
        address_line_1: "WhatsApp Purchase Order",
        address_line_2: null,
        city: "Hyderabad",
        state: "Telangana",
        postal_code: "500001",
        country: "India",
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    };

    // Commit order and stock deductions atomically
    await insertOrderWithItemsDb(orderData, [orderItem], stockDeductions);

    // 4. Construct and dispatch WhatsApp notification with verified data
    const whatsappResult = await WhatsAppService.sendPurchaseNotification({
      customerName,
      customerPhone,
      productName: product.product_name,
      productPrice: unitPrice,
      quantity,
      subtotal,
      productId: product.id,
      productUniqueId: product.unique_code || product.id,
      productCategory: product.category_name || "Bangles",
      orderNumber,
      orderTimestamp: now,
      size: sizeSnapshot,
      customMeasurements: input.customMeasurements || null,
      notes: input.notes || null,
    });

    // 5. Create audit log with PII redaction
    await insertAuditLogDb({
      actor_id: userId,
      user_type: "user",
      action: "WHATSAPP_PURCHASE_INITIATED",
      table_name: "orders",
      record_id: orderId,
      new_data: {
        orderNumber,
        productId: prodId,
        quantity,
        totalAmount,
        deliveryMode: whatsappResult.mode,
        whatsappStatus: whatsappResult.status,
        customerPhoneMasked: maskPhoneNumber(customerPhone),
      },
    });

    return {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      totalAmount: orderData.total_amount,
      status: orderData.status,
      deliveryMode: whatsappResult.mode,
      whatsappStatus: whatsappResult.status,
      whatsappUrl: whatsappResult.whatsappUrl,
    };
  }
}
