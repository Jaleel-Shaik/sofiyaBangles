import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { AdminStaffService } from "../services/adminStaff.service";
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from "../../../core/errors/app.error";

/**
 * List all administrator accounts (SuperAdmin exclusive)
 */
export const listAdmins = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const admins = await AdminStaffService.listAdmins();
  return res.json({
    success: true,
    data: admins,
    total: admins.length,
  });
});

/**
 * Get administrator account by ID
 */
export const getAdminById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const admin = await AdminStaffService.getAdminById(id);
    return sendSuccess(res, admin);
  } catch (err: any) {
    if (err.message === "ADMIN_NOT_FOUND") throw new NotFoundError("Admin account not found.");
    throw err;
  }
});

/**
 * Create a new Store Admin / Manager account
 */
export const createAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const newAdminData = await AdminStaffService.createAdmin(req.body, req.user!.userId);
    return sendSuccess(
      res,
      {
        id: newAdminData.id,
        full_name: newAdminData.full_name,
        email: newAdminData.email,
        phone: newAdminData.phone,
        role: newAdminData.role,
        isActive: true,
        twoFactorEnabled: false,
        created_at: newAdminData.created_at,
      },
      {
        message: "Admin account created successfully.",
        statusCode: 201,
      }
    );
  } catch (err: any) {
    if (err.message === "MISSING_REQUIRED_FIELDS") {
      throw new BadRequestError("Full name, email, and password are required.");
    }
    if (err.message === "PASSWORD_TOO_SHORT") {
      throw new BadRequestError("Password must be at least 6 characters long.");
    }
    if (err.message === "ADMIN_EXISTS") {
      throw new ConflictError("An administrator with this email already exists.");
    }
    throw err;
  }
});

/**
 * Toggle Admin active / inactive status
 */
export const updateAdminStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const { isActive } = req.body;

  try {
    const result = await AdminStaffService.updateAdminStatus(id, isActive, req.user!.userId);
    return sendSuccess(
      res,
      result,
      `Admin account ${result.isActive ? "activated" : "deactivated"} successfully.`
    );
  } catch (err: any) {
    if (err.message === "INVALID_STATUS") {
      throw new BadRequestError("isActive (boolean) is required.");
    }
    if (err.message === "ADMIN_NOT_FOUND") {
      throw new NotFoundError("Admin account not found.");
    }
    if (err.message === "CANNOT_DEACTIVATE_SUPERADMIN") {
      throw new ForbiddenError("SuperAdmin accounts cannot be deactivated.");
    }
    throw err;
  }
});

/**
 * Delete an Administrator account
 */
export const deleteAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const result = await AdminStaffService.deleteAdmin(id, req.user!.userId);
    return sendSuccess(res, result, "Admin account deleted successfully.");
  } catch (err: any) {
    if (err.message === "ADMIN_NOT_FOUND") {
      throw new NotFoundError("Admin account not found.");
    }
    if (err.message === "CANNOT_DELETE_SUPERADMIN") {
      throw new ForbiddenError("SuperAdmin accounts cannot be deleted.");
    }
    throw err;
  }
});
