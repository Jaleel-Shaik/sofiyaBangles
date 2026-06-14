import { Response } from "express";
import { AuthRequest } from "../types";
import {
  registerService,
  loginService,
  getMeService,
  updateProfileService,
} from "../services/auth.service";

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const result = await registerService(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: "Registration successful.",
    });
  } catch (error: any) {
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

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const result = await loginService(req.body);

    res.json({
      success: true,
      data: result,
      message: "Login successful.",
    });
  } catch (error: any) {
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

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getMeService(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
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

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await updateProfileService(req.user!.userId, req.body);

    res.json({
      success: true,
      data: user,
      message: "Profile updated successfully.",
    });
  } catch (error: any) {
    console.error("UpdateProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};
