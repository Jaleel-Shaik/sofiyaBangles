"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.getUserById = exports.getUsers = void 0;
const params_1 = require("../utils/params");
const user_service_1 = require("../services/user.service");
const getUsers = async (req, res) => {
    try {
        const page = (0, params_1.getQuery)(req, "page");
        const limit = (0, params_1.getQuery)(req, "limit");
        const role = (0, params_1.getQuery)(req, "role");
        const search = (0, params_1.getQuery)(req, "search");
        const result = await (0, user_service_1.getAllUsersService)({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            role,
            search,
        });
        res.json({
            success: true,
            data: result.users,
            pagination: {
                page: Number(page) || 1,
                limit: Number(limit) || 20,
                total: result.total,
                totalPages: Math.ceil(result.total / (Number(limit) || 20)),
            },
        });
    }
    catch (error) {
        console.error("GetUsers error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users.",
        });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const user = await (0, user_service_1.getUserByIdService)(id);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({
                success: false,
                message: "User not found.",
            });
            return;
        }
        console.error("GetUserById error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user.",
        });
    }
};
exports.getUserById = getUserById;
const updateUserRole = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const { role } = req.body;
        if (!role) {
            res.status(400).json({
                success: false,
                message: "Role is required.",
            });
            return;
        }
        const user = await (0, user_service_1.updateUserRoleService)(id, role, req.user.userId);
        res.json({
            success: true,
            data: user,
            message: "User role updated successfully.",
        });
    }
    catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({
                success: false,
                message: "User not found.",
            });
            return;
        }
        if (error.message === "INVALID_ROLE") {
            res.status(400).json({
                success: false,
                message: "Invalid role. Must be 'user', 'admin', or 'super_admin'.",
            });
            return;
        }
        console.error("UpdateUserRole error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user role.",
        });
    }
};
exports.updateUserRole = updateUserRole;
