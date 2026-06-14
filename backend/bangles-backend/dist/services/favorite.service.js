"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFavoritesService = exports.removeFavoriteService = exports.addFavoriteService = void 0;
const favorite_repository_1 = require("../repositories/favorite.repository");
const addFavoriteService = async (userId, productId) => {
    return (0, favorite_repository_1.addFavoriteRepo)(userId, productId);
};
exports.addFavoriteService = addFavoriteService;
const removeFavoriteService = async (userId, productId) => {
    return (0, favorite_repository_1.removeFavoriteRepo)(userId, productId);
};
exports.removeFavoriteService = removeFavoriteService;
const getUserFavoritesService = async (userId) => {
    return (0, favorite_repository_1.getUserFavoritesRepo)(userId);
};
exports.getUserFavoritesService = getUserFavoritesService;
