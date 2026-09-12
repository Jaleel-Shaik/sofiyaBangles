import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { insertAuditLogDb } from "../../../db/audit.db";
import {
  getAllAdminsDb,
  getAdminByEmailDb,
  getAdminByIdDb,
  insertAdminDb,
  updateAdminDb,
  deleteAdminDb,
} from "../../../db/adminStaff.db";
import { AdminRecord } from "../../../models/adminStaff.model";

export class AdminStaffService {
  static async listAdmins() {
    const admins = await getAllAdminsDb();
    return admins.map((data: AdminRecord) => ({
      id: data.id,
      full_name: data.full_name || "Admin",
      email: data.email,
      phone: data.phone || null,
      role: data.role || "admin",
      isActive: data.isActive !== false && data.is_active !== false,
      twoFactorEnabled: data.twoFactorEnabled === true || data.is_2fa_enabled === true,
      created_at: data.created_at || null,
      updated_at: data.updated_at || null,
    }));
  }

  static async createAdmin(adminData: { full_name: string; email: string; password?: string; phone?: string }, actorId: string) {
    const { full_name, email, password, phone } = adminData;

    if (!full_name || !email || !password) {
      throw new Error("MISSING_REQUIRED_FIELDS");
    }

    if (password.length < 6) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingAdmin = await getAdminByEmailDb(normalizedEmail);
    
    if (existingAdmin) {
      throw new Error("ADMIN_EXISTS");
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

    await insertAdminDb(adminId, newAdminData);

    await insertAuditLogDb({
      actor_id: actorId,
      action: "ADMIN_STAFF_CREATED",
      table_name: "admins",
      record_id: adminId,
      new_data: { full_name, email: normalizedEmail, role: "admin" },
    });

    return newAdminData;
  }

  static async updateAdminStatus(id: string, isActive: boolean, actorId: string) {
    if (typeof isActive !== "boolean") {
      throw new Error("INVALID_STATUS");
    }

    const admin = await getAdminByIdDb(id);
    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.role === "super_admin" && !isActive) {
      throw new Error("CANNOT_DEACTIVATE_SUPERADMIN");
    }

    const now = new Date().toISOString();
    await updateAdminDb(id, {
      isActive,
      is_active: isActive,
      updated_at: now,
    });

    await insertAuditLogDb({
      actor_id: actorId,
      action: isActive ? "ADMIN_STAFF_ACTIVATED" : "ADMIN_STAFF_DEACTIVATED",
      table_name: "admins",
      record_id: id,
      old_data: { isActive: admin.isActive },
      new_data: { isActive },
    });

    return { id, isActive };
  }

  static async deleteAdmin(id: string, actorId: string) {
    const admin = await getAdminByIdDb(id);
    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.role === "super_admin" || id === actorId) {
      throw new Error("CANNOT_DELETE_SUPERADMIN");
    }

    await deleteAdminDb(id);

    await insertAuditLogDb({
      actor_id: actorId,
      action: "ADMIN_STAFF_DELETED",
      table_name: "admins",
      record_id: id,
      old_data: { email: admin.email, full_name: admin.full_name },
    });

    return { id };
  }
}
