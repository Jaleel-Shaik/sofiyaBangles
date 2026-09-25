import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { OrderService } from "../services/order.service";
import { AdminLinkService } from "../services/admin-link.service";
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

export const initiateWhatsAppPurchase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const {
    productId,
    product_id,
    variantId,
    variant_id,
    quantity,
    size,
    customMeasurements,
    notes,
    customerName,
    customerPhone,
    phone,
  } = req.body;

  try {
    const result = await OrderService.initiateWhatsAppPurchaseOrder(userId, {
      productId: productId || product_id,
      variantId: variantId || variant_id,
      quantity,
      size,
      customMeasurements,
      notes,
      customerName,
      customerPhone: customerPhone || phone,
    });
    return sendSuccess(res, result, {
      message: "WhatsApp purchase order initiated successfully.",
      statusCode: 201,
    });
  } catch (err: any) {
    if (err.message === "PROFILE_PHONE_REQUIRED") {
      throw new BadRequestError(
        "Please add a verified mobile number to your profile before purchasing.",
        "PROFILE_PHONE_REQUIRED"
      );
    }
    if (err.message === "PROFILE_NAME_REQUIRED") {
      throw new BadRequestError(
        "Please add your name to your profile before purchasing.",
        "PROFILE_NAME_REQUIRED"
      );
    }
    if (err.message === "PRODUCT_NOT_FOUND" || err.message === "PRODUCT_NOT_AVAILABLE") {
      throw new NotFoundError("Selected product is currently unavailable.");
    }
    if (err.message === "VARIANT_NOT_AVAILABLE") {
      throw new BadRequestError("Selected size/variant is no longer available.");
    }
    if (err.message?.startsWith("Insufficient stock") || err.message?.includes("Only")) {
      throw new BadRequestError(err.message, "INSUFFICIENT_STOCK");
    }
    if (err.message === "USER_NOT_FOUND") {
      throw new NotFoundError("User account not found. Please log in again.", "USER_NOT_FOUND");
    }
    if (err.message === "PRODUCT_ID_REQUIRED") {
      throw new BadRequestError("Product ID is required.", "PRODUCT_ID_REQUIRED");
    }
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof ForbiddenError) {
      throw err;
    }
    console.error("WhatsApp purchase initiation error:", err);
    throw new BadRequestError(err.message || "Failed to process WhatsApp purchase request.");
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

export const deleteOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    await OrderService.deleteOrder(id, req.user!.userId);
    return sendSuccess(res, null, "Order deleted successfully.");
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") throw new NotFoundError("Order not found.");
    throw err;
  }
});

export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = req.body.productId || req.body.product_id;
  const rating = Number(req.body.rating || req.body.qualityRating || req.body.quality_rating || 5);
  const comment = req.body.comment;
  const suggestion = req.body.suggestion;
  const isDefective = req.body.isDefective !== undefined ? req.body.isDefective : req.body.is_defective;
  const damageDetails = req.body.damageDetails || req.body.damage_details;
  const orderId = req.body.orderId || req.body.order_id;
  const orderItemId = req.body.orderItemId || req.body.order_item_id;

  try {
    const review = await OrderService.createReview(req.user!.userId, {
      productId,
      orderId,
      orderItemId,
      rating,
      comment,
      suggestion,
      isDefective,
      damageDetails,
      customerName: req.body.customerName || req.body.customer_name,
    });
    return sendSuccess(res, review, { statusCode: 201 });
  } catch (err: any) {
    if (err.message === "CANNOT_REVIEW_UNPURCHASED_PRODUCT") {
      throw new BadRequestError("You can only review products from your purchased orders.", "UNPURCHASED_PRODUCT");
    }
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

export const getAllReviewsForAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reviews = await OrderService.getAllReviewsForAdmin();
  return sendSuccess(res, reviews);
});

export const verifyAdminLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  if (!token) throw new BadRequestError("Token is required.", "MISSING_TOKEN");

  const result = await AdminLinkService.verifyAdminActionToken(token, req.user);
  return sendSuccess(res, result, "Admin access link verified successfully.");
});
