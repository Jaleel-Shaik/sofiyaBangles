import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { db } from "../../../shared/config/firebase";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { getParam } from "../../../shared/utils/params";

/**
 * List all administrator accounts (SuperAdmin exclusive)
 */
export const listAdmins = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection("admins").get();
    const admins = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        full_name: data.full_name || "Admin",
        email: data.email,
        phone: data.phone || null,
        role: data.role || "admin",
        isActive: data.isActive !== false && data.is_active !== false,
        twoFactorEnabled: data.twoFactorEnabled === true || data.is_2fa_enabled === true,
        created_at: data.created_at || null,
        updated_at: data.updated_at || null,
      };
    });

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
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({ success: false, message: "Full name, email, and password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing admin with same email
    const existingSnap = await db.collection("admins").where("email", "==", normalizedEmail).limit(1).get();
    if (!existingSnap.empty) {
      res.status(409).json({ success: false, message: "An administrator with this email already exists." });
      return;
    }

    const adminId = `admin_${uuidv4().replace(/-/g, "").substring(0, 12)}`;
    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const newAdminData = {
      id: adminId,
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      role: "admin",
      user_type: "admin",
      password_hash,
      avatar_url: null,
      expo_push_token: null,
      isActive: true,
      is_active: true,
      twoFactorEnabled: false,
      is_2fa_enabled: false,
      twoFactorSecretEncrypted: null,
      two_fa_secret: null,
      pendingTwoFactorSecretEncrypted: null,
      backupCodesHash: [],
      failedOtpAttempts: 0,
      failed_attempts: 0,
      accountLockedUntil: null,
      created_at: now,
      updated_at: now,
    };

    await db.collection("admins").doc(adminId).set(newAdminData);

    // Audit log
    await createAuditLogModel({
      actor_id: req.user!.userId,
      action: "ADMIN_STAFF_CREATED",
      table_name: "admins",
      record_id: adminId,
      new_data: { full_name, email: normalizedEmail, role: "admin" },
    });

    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      data: {
        id: adminId,
        full_name: newAdminData.full_name,
        email: newAdminData.email,
        phone: newAdminData.phone,
        role: newAdminData.role,
        isActive: true,
        twoFactorEnabled: false,
        created_at: now,
      },
    });
  } catch (error: any) {
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

    if (typeof isActive !== "boolean") {
      res.status(400).json({ success: false, message: "isActive (boolean) is required." });
      return;
    }

    const adminRef = db.collection("admins").doc(id);
    const doc = await adminRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: "Admin account not found." });
      return;
    }

    const adminData = doc.data();

    // Disallow deactivating SuperAdmin accounts
    if (adminData?.role === "super_admin" && !isActive) {
      res.status(403).json({ success: false, message: "SuperAdmin accounts cannot be deactivated." });
      return;
    }

    const now = new Date().toISOString();
    await adminRef.update({
      isActive,
      is_active: isActive,
      updated_at: now,
    });

    // Audit log
    await createAuditLogModel({
      actor_id: req.user!.userId,
      action: isActive ? "ADMIN_STAFF_ACTIVATED" : "ADMIN_STAFF_DEACTIVATED",
      table_name: "admins",
      record_id: id,
      old_data: { isActive: adminData?.isActive },
      new_data: { isActive },
    });

    res.json({
      success: true,
      message: `Admin account ${isActive ? "activated" : "deactivated"} successfully.`,
      data: { id, isActive },
    });
  } catch (error: any) {
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

    const adminRef = db.collection("admins").doc(id);
    const doc = await adminRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: "Admin account not found." });
      return;
    }

    const adminData = doc.data();

    // Prevent deleting super_admin or self
    if (adminData?.role === "super_admin" || id === req.user!.userId) {
      res.status(403).json({ success: false, message: "SuperAdmin accounts cannot be deleted." });
      return;
    }

    await adminRef.delete();

    // Audit log
    await createAuditLogModel({
      actor_id: req.user!.userId,
      action: "ADMIN_STAFF_DELETED",
      table_name: "admins",
      record_id: id,
      old_data: { email: adminData?.email, full_name: adminData?.full_name },
    });

    res.json({
      success: true,
      message: "Admin account deleted successfully.",
      data: { id },
    });
  } catch (error: any) {
    console.error("DeleteAdmin error:", error);
    res.status(500).json({ success: false, message: "Failed to delete administrator account." });
  }
};
