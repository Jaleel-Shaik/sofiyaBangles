import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { AdminStaffService } from "../services/adminStaff.service";

/**
 * List all administrator accounts (SuperAdmin exclusive)
 */
export const listAdmins = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const admins = await AdminStaffService.listAdmins();
    res.json({
      success: true,
      data: admins,
      total: admins.length,
    });
  } catch (error: any) {
    console.error("ListAdmins error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin staff list." });
  }
};

/**
 * Create a new Store Admin / Manager account
 */
export const createAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const newAdminData = await AdminStaffService.createAdmin(req.body, req.user!.userId);
    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      data: {
        id: newAdminData.id,
        full_name: newAdminData.full_name,
        email: newAdminData.email,
        phone: newAdminData.phone,
        role: newAdminData.role,
        isActive: true,
        twoFactorEnabled: false,
        created_at: newAdminData.created_at,
      },
    });
  } catch (error: any) {
    if (error.message === "MISSING_REQUIRED_FIELDS") {
      res.status(400).json({ success: false, message: "Full name, email, and password are required." });
      return;
    }
    if (error.message === "PASSWORD_TOO_SHORT") {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      return;
    }
    if (error.message === "ADMIN_EXISTS") {
      res.status(409).json({ success: false, message: "An administrator with this email already exists." });
      return;
    }
    console.error("CreateAdmin error:", error);
    res.status(500).json({ success: false, message: "Failed to create administrator account." });
  }
};

/**
 * Toggle Admin active / inactive status
 */
export const updateAdminStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req, "id");
    const { isActive } = req.body;
    
    const result = await AdminStaffService.updateAdminStatus(id, isActive, req.user!.userId);

    res.json({
      success: true,
      message: `Admin account ${result.isActive ? "activated" : "deactivated"} successfully.`,
      data: result,
    });
  } catch (error: any) {
    if (error.message === "INVALID_STATUS") {
      res.status(400).json({ success: false, message: "isActive (boolean) is required." });
      return;
    }
    if (error.message === "ADMIN_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Admin account not found." });
      return;
    }
    if (error.message === "CANNOT_DEACTIVATE_SUPERADMIN") {
      res.status(403).json({ success: false, message: "SuperAdmin accounts cannot be deactivated." });
      return;
    }
    console.error("UpdateAdminStatus error:", error);
    res.status(500).json({ success: false, message: "Failed to update admin account status." });
  }
};

/**
 * Delete an Administrator account
 */
export const deleteAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req, "id");
    const result = await AdminStaffService.deleteAdmin(id, req.user!.userId);
    
    res.json({
      success: true,
      message: "Admin account deleted successfully.",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "ADMIN_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Admin account not found." });
      return;
    }
    if (error.message === "CANNOT_DELETE_SUPERADMIN") {
      res.status(403).json({ success: false, message: "SuperAdmin accounts cannot be deleted." });
      return;
    }
    console.error("DeleteAdmin error:", error);
    res.status(500).json({ success: false, message: "Failed to delete administrator account." });
  }
};
