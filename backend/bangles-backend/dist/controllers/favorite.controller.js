"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFavorite = exports.addFavorite = exports.getFavorites = void 0;
const params_1 = require("../utils/params");
const favorite_service_1 = require("../services/favorite.service");
const getFavorites = async (req, res) => {
    try {
        const favorites = await (0, favorite_service_1.getUserFavoritesService)(req.user.userId);
        res.json({
            success: true,
            data: favorites,
        });
    }
    catch (error) {
        console.error("GetFavorites error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch favorites.",
        });
    }
};
exports.getFavorites = getFavorites;
const addFavorite = async (req, res) => {
    try {
        const productId = (0, params_1.getParam)(req, "productId");
        const favorite = await (0, favorite_service_1.addFavoriteService)(req.user.userId, productId);
        res.status(201).json({
            success: true,
            data: favorite,
            message: "Added to favorites.",
        });
    }
    catch (error) {
        console.error("AddFavorite error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add favorite.",
        });
    }
};
exports.addFavorite = addFavorite;
const removeFavorite = async (req, res) => {
    try {
        const productId = (0, params_1.getParam)(req, "productId");
        await (0, favorite_service_1.removeFavoriteService)(req.user.userId, productId);
        res.json({
            success: true,
            message: "Removed from favorites.",
        });
    }
    catch (error) {
        console.error("RemoveFavorite error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove favorite.",
        });
    }
};
exports.removeFavorite = removeFavorite;
