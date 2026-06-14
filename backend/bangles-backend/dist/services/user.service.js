"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getUserByIdService = exports.getAllUsersService = void 0;
const user_repository_1 = require("../repositories/user.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const getAllUsersService = async (options) => {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    return (0, user_repository_1.getAllUsersRepo)({ page, limit, role: options.role, search: options.search });
};
exports.getAllUsersService = getAllUsersService;
const getUserByIdService = async (id) => {
    const user = await (0, user_repository_1.getUserByIdRepo)(id);
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }
    return user;
};
exports.getUserByIdService = getUserByIdService;
const updateUserRoleService = async (id, role, actorId) => {
    const existing = await (0, user_repository_1.getUserByIdRepo)(id);
    if (!existing) {
        throw new Error("USER_NOT_FOUND");
    }
    const validRoles = ["user", "admin", "super_admin"];
    if (!validRoles.includes(role)) {
        throw new Error("INVALID_ROLE");
    }
    const updated = await (0, user_repository_1.updateUserRoleRepo)(id, role);
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "USER_ROLE_CHANGED",
        table_name: "profiles",
        record_id: id,
        old_data: { role: existing.role },
        new_data: { role },
    });
    return updated;
};
exports.updateUserRoleService = updateUserRoleService;
