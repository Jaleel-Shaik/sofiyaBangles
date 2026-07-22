import {
  getAllUsersModel,
  getUserByIdModel,
  updateUserRoleModel,
} from "../models/user.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";

export const getAllUsersService = async (options: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);

  return getAllUsersModel({ page, limit, role: options.role, search: options.search });
};

export const getUserByIdService = async (id: string) => {
  const user = await getUserByIdModel(id);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  return user;
};

export const updateUserRoleService = async (
  id: string,
  role: string,
  actorId: string,
) => {
  const existing = await getUserByIdModel(id);
  if (!existing) {
    throw new Error("USER_NOT_FOUND");
  }

  const validRoles = ["user", "admin", "super_admin"];
  if (!validRoles.includes(role)) {
    throw new Error("INVALID_ROLE");
  }

  const updated = await updateUserRoleModel(id, role);

  await createAuditLogModel({
    actor_id: actorId,
    action: "USER_ROLE_CHANGED",
    table_name: "profiles",
    record_id: id,
    old_data: { role: existing.role },
    new_data: { role },
  });

  return updated;
};
