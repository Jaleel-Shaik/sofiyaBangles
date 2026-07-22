import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import {
  getAllUsersService,
  getUserByIdService,
  updateUserRoleService,
} from "../services/user.service";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");
    const role = getQuery(req, "role");
    const search = getQuery(req, "search");

    const result = await getAllUsersService({
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
  } catch (error: any) {
    console.error("GetUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const user = await getUserByIdService(id);

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
    console.error("GetUserById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
    });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        message: "Role is required.",
      });
      return;
    }

    const user = await updateUserRoleService(id, role, req.user!.userId);

    res.json({
      success: true,
      data: user,
      message: "User role updated successfully.",
    });
  } catch (error: any) {
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
