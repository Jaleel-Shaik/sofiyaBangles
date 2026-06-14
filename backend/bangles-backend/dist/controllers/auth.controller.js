"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth.service");
const register = async (req, res) => {
    try {
        const result = await (0, auth_service_1.registerService)(req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: "Registration successful.",
        });
    }
    catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
            return;
        }
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again.",
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const result = await (0, auth_service_1.loginService)(req.body);
        res.json({
            success: true,
            data: result,
            message: "Login successful.",
        });
    }
    catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        if (error.message === "ACCOUNT_DISABLED") {
            res.status(403).json({
                success: false,
                message: "Your account has been disabled. Contact support.",
            });
            return;
        }
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed. Please try again.",
        });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await (0, auth_service_1.getMeService)(req.user.userId);
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
        console.error("GetMe error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch profile.",
        });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const user = await (0, auth_service_1.updateProfileService)(req.user.userId, req.body);
        res.json({
            success: true,
            data: user,
            message: "Profile updated successfully.",
        });
    }
    catch (error) {
        console.error("UpdateProfile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile.",
        });
    }
};
exports.updateProfile = updateProfile;
