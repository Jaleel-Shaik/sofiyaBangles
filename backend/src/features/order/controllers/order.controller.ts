import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import {
  createOrderModel,
  getUserOrdersModel,
  createReviewModel,
  getProductReviewsModel,
} from "../models/order.model";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, productName, price, imageUrl } = req.body;
    const order = await createOrderModel({
      userId: req.user!.userId,
      productId,
      productName,
      price,
      imageUrl,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    console.error("CreateOrder error", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create order." });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await getUserOrdersModel(req.user!.userId);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    console.error("GetUserOrders error", error);
    res.status(500).json({ success: false, message: "Failed to load orders." });
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
