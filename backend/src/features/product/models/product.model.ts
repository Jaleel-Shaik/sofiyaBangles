/**
 * Feature Model: Product
 * Re-exports pure data models, entity interfaces, and constraints from src/models/product.model
 * Re-exports database operations from src/db/product.db for backward-compatible module resolution.
 */

export * from "../../../models/product.model";
import {
  getActiveProductsDb,
  getAllAdminProductsDb,
  getProductByIdDb,
  insertProductWithRelationsDb,
  updateProductWithRelationsDb,
  updateProductDocDb,
  softDeleteProductDb,
  restoreProductDb,
  deleteProductsByCategoryBatchDb,
  getVariantsByProductDb,
  getImagesByProductDb,
  deleteFavoritesByProductDb,
  deleteFavoritesByProductsDb,
  deleteReviewsByProductDb,
  deleteReviewsByProductsDb,
  nullifyNotificationProductRefDb,
  nullifyNotificationsByProductsDb,
  generateNextProductSequenceDb,
} from "../../../db/product.db";
import { getProductsService, getAdminProductsService, getProductByIdService, searchProductsService, getRecommendedProductsService, getNewArrivalsService } from "../services/product.service";

export {
  generateNextProductSequenceDb as generateNextProductCodeModel,
  insertProductWithRelationsDb as createProductModel,
  updateProductWithRelationsDb as updateProductModel,
  softDeleteProductDb as deleteProductModel,
  restoreProductDb as restoreProductModel,
  deleteProductsByCategoryBatchDb as deleteProductsByCategoryModel,
  deleteFavoritesByProductDb as deleteFavoritesByProductModel,
  deleteFavoritesByProductsDb as deleteFavoritesByProductsModel,
  deleteReviewsByProductDb as deleteReviewsByProductModel,
  deleteReviewsByProductsDb as deleteReviewsByProductsModel,
  nullifyNotificationProductRefDb as nullifyNotificationProductRef,
  nullifyNotificationsByProductsDb as nullifyNotificationsByProductsModel,
  getProductsService as getProductsModel,
  getAdminProductsService as getAdminProductsModel,
  getProductByIdService as getProductByIdModel,
  searchProductsService as searchProductsModel,
  getRecommendedProductsService as getRecommendedProductsModel,
  getNewArrivalsService as getNewArrivalsModel,
};

export const calculateReviewStats = (reviews: Array<{ rating: number }>) => {
  if (!reviews.length) {
    return { rating: 0, reviews: 0 };
  }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    rating: Number((total / reviews.length).toFixed(1)),
    reviews: reviews.length,
  };
};
