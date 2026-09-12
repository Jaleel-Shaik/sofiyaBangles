/**
 * Feature Model: Favorite
 * Re-exports pure data models, entity interfaces, and constraints from src/models/favorite.model
 * Re-exports database operations from src/db/favorite.db for backward-compatible module resolution.
 */

export * from "../../../models/favorite.model";
export {
  findFavoriteDb as findFavoriteModel,
  insertFavoriteDb as insertFavoriteModel,
  deleteFavoriteDb as deleteFavoriteModel,
  getUserFavoritesDb as getUserFavoritesModel,
  isFavoritedDb as isFavoritedModel,
} from "../../../db/favorite.db";
