import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { OrderService } from "../services/order.service";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../../core/errors/app.error";

export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items, shippingAddressSnapshot } = req.body;
  try {
    const order = await OrderService.createOrder(req.user!.userId, items, shippingAddressSnapshot);
    return sendSuccess(res, order, { statusCode: 201 });
  } catch (err: any) {
    if (err.message === "EMPTY_ITEMS") throw new BadRequestError("Order must contain at least one item.");
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    if (err.message === "PRODUCT_NOT_AVAILABLE") throw new BadRequestError("Product is no longer available.");
    throw err;
  }
});

export const getUserOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ordersWithItems = await OrderService.getUserOrders(req.user!.userId);
  return sendSuccess(res, ordersWithItems);
});

export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const order = await OrderService.getOrderById(id, req.user!.userId, req.user?.role);
    return sendSuccess(res, order);
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Order not found.");
    if (err.message === "UNAUTHORIZED_ACCESS") throw new ForbiddenError("You do not have permission to view this order.");
    throw err;
  }
});

export const getAdminOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const result = await OrderService.getAllAdminOrders({ page, limit, status, search });

  return sendSuccess(res, result.orders, {
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

export const completeOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const order = await OrderService.completeOrder(id, req.user!.userId);
    return sendSuccess(res, order, "Order completed and revenue allocated successfully.");
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Order not found.");
    throw err;
  }
});

export const refundOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const { reason } = req.body;
  try {
    const order = await OrderService.refundOrder(id, req.user!.userId, reason);
    return sendSuccess(res, order, "Order refunded and revenue reversed successfully.");
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Order not found.");
    throw err;
  }
});

export const updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const { status, notes } = req.body;
  if (!status) throw new BadRequestError("Status is required.", "MISSING_STATUS");

  try {
    const order = await OrderService.updateOrderStatus(id, req.user!.userId, status, notes);
    return sendSuccess(res, order, `Order status updated to ${status} successfully.`);
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Order not found.");
    throw err;
  }
});

export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = req.body.productId || req.body.product_id;
  const rating = Number(req.body.rating);
  const comment = req.body.comment;

  try {
    const review = await OrderService.createReview(req.user!.userId, {
      productId,
      rating,
      comment,
      customerName: req.body.customerName || req.body.customer_name,
    });
    return sendSuccess(res, review, { statusCode: 201 });
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Purchase record not found.");
    throw err;
  }
});

export const getProductReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = Array.isArray(req.params.productId)
    ? req.params.productId[0]
    : req.params.productId;
  const reviews = await OrderService.getProductReviews(productId);
  return sendSuccess(res, reviews);
});
