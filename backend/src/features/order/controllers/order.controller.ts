import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { OrderService } from "../services/order.service";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, shippingAddressSnapshot } = req.body;
    const order = await OrderService.createOrder(req.user!.userId, items, shippingAddressSnapshot);
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    if (error.message === "EMPTY_ITEMS") {
      res.status(400).json({ success: false, message: "Order must contain at least one item." });
      return;
    }
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    if (error.message === "PRODUCT_NOT_AVAILABLE") {
      res.status(400).json({ success: false, message: "Product is no longer available." });
      return;
    }
    console.error("CreateOrder error", error);
    res.status(500).json({ success: false, message: "Failed to create order." });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const ordersWithItems = await OrderService.getUserOrders(req.user!.userId);
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

    const result = await OrderService.getAllAdminOrders({ page, limit, status, search });

    res.json({
      success: true,
      data: result.orders,
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
    const order = await OrderService.completeOrder(id, req.user!.userId);
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
    const order = await OrderService.refundOrder(id, req.user!.userId, reason);
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

    const order = await OrderService.updateOrderStatus(id, req.user!.userId, status, notes);
    res.json({ success: true, data: order, message: `Order status updated to ${status} successfully.` });
  } catch (error: any) {
    if (error.message === "MISSING_STATUS") {
      res.status(400).json({ success: false, message: "Status is required." });
      return;
    }
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
    const productId = req.body.productId || req.body.product_id;
    const rating = Number(req.body.rating);
    const comment = req.body.comment;
    const damageDetails = req.body.damageDetails || req.body.damage_details;

    const review = await OrderService.createReview(
      req.user!.userId,
      {
        productId,
        rating,
        comment,
        customerName: req.body.customerName || req.body.customer_name,
      }
    );

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Purchase record not found." });
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
    const reviews = await OrderService.getProductReviews(productId);
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    console.error("GetProductReviews error", error);
    res.status(500).json({ success: false, message: "Failed to load reviews." });
  }
};
