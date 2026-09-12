import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  getAllUsersService,
  getUserByIdService,
  updateUserRoleService,
} from "../services/user.service";
import { NotFoundError, BadRequestError } from "../../../core/errors/app.error";

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");
  const role = getQuery(req, "role");
  const search = getQuery(req, "search");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getAllUsersService({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    role,
    search,
  });

  return sendSuccess(res, result.users, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});

export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const user = await getUserByIdService(id);
    return sendSuccess(res, user);
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") throw new NotFoundError("User not found.");
    throw err;
  }
});

export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const { role } = req.body;

  if (!role) {
    throw new BadRequestError("Role is required.");
  }

  try {
    const user = await updateUserRoleService(id, role, req.user!.userId);
    return sendSuccess(res, user, "User role updated successfully.");
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") throw new NotFoundError("User not found.");
    if (err.message === "INVALID_ROLE") {
      throw new BadRequestError("Invalid role. Must be 'user', 'admin', or 'super_admin'.");
    }
    throw err;
  }
});
