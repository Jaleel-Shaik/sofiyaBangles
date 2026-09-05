import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
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

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, shippingAddressSnapshot } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Order must contain at least one item." });
      return;
    }

    const order = await createOrderModel({
      userId: req.user!.userId,
      items,
      shippingAddressSnapshot
    });

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    if (error.message === "PRODUCT_NOT_AVAILABLE") {
      res.status(400).json({ success: false, message: "Product is no longer available." });
      return;
    }
    console.error("CreateOrder error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create order." });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await getUserOrdersModel(req.user!.userId);
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await getOrderItemsModel(order.id);
      return { ...order, items };
    }));
    res.json({ success: true, data: ordersWithItems });
  } catch (error: any) {
    console.error("GetUserOrders error", error);
    res.status(500).json({ success: false, message: "Failed to load orders." });
  }
};

export const getAdminOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await getAllAdminOrdersModel({ page, limit, status, search });
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

    res.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error("GetAdminOrders error", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin orders." });
  }
};

export const completeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const order = await completeOrderModel(id, req.user!.userId);
    res.json({ success: true, data: order, message: "Order completed and revenue allocated successfully." });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }
    console.error("CompleteOrder error", error);
    res.status(500).json({ success: false, message: "Failed to complete order." });
  }
};

export const refundOrder = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const { reason } = req.body;
    const order = await refundOrderModel(id, req.user!.userId, reason);
    res.json({ success: true, data: order, message: "Order refunded and revenue reversed successfully." });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }
    console.error("RefundOrder error", error);
    res.status(500).json({ success: false, message: "Failed to refund order." });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const { status, notes } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required." });
      return;
    }

    const order = await updateOrderStatusModel(id, req.user!.userId, status, notes);
    res.json({ success: true, data: order, message: `Order status updated to ${status} successfully.` });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }
    console.error("UpdateOrderStatus error", error);
    res.status(500).json({ success: false, message: "Failed to update order status." });
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, rating, comment, damageDetails } = req.body;
    const review = await createReviewModel({
      userId: req.user!.userId,
      productId,
      rating,
      comment,
      damageDetails,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res
        .status(404)
        .json({ success: false, message: "Purchase record not found." });
      return;
    }

    console.error("CreateReview error", error);
    res.status(500).json({ success: false, message: "Failed to save review." });
  }
};

export const getProductReviews = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Array.isArray(req.params.productId)
      ? req.params.productId[0]
      : req.params.productId;
    const reviews = await getProductReviewsModel(productId);
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    console.error("GetProductReviews error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load reviews." });
  }
};
