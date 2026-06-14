"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileService = exports.getMeService = exports.loginService = exports.registerService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_repository_1 = require("../repositories/auth.repository");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const audit_repository_1 = require("../repositories/audit.repository");
const registerService = async (input) => {
    // Check if email already exists
    const existing = await (0, auth_repository_1.findProfileByEmailRepo)(input.email);
    if (existing) {
        throw new Error("EMAIL_EXISTS");
    }
    // Hash password
    const salt = await bcryptjs_1.default.genSalt(12);
    const password_hash = await bcryptjs_1.default.hash(input.password, salt);
    // Create profile
    const profile = await (0, auth_repository_1.createProfileRepo)({
        full_name: input.full_name,
        email: input.email,
        password_hash,
        phone: input.phone,
    });
    // Generate JWT
    const token = (0, auth_middleware_1.generateToken)({
        userId: profile.id,
        email: profile.email,
        role: profile.role,
    });
    // Audit log
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: profile.id,
        action: "USER_REGISTERED",
        table_name: "profiles",
        record_id: profile.id,
    });
    // Return without password hash
    const { password_hash: _, ...safeProfile } = profile;
    return { user: safeProfile, token };
};
exports.registerService = registerService;
const loginService = async (input) => {
    // Find user
    const profile = await (0, auth_repository_1.findProfileByEmailRepo)(input.email);
    if (!profile) {
        throw new Error("INVALID_CREDENTIALS");
    }
    if (!profile.is_active) {
        throw new Error("ACCOUNT_DISABLED");
    }
    // Verify password
    const isValidPassword = await bcryptjs_1.default.compare(input.password, profile.password_hash);
    if (!isValidPassword) {
        throw new Error("INVALID_CREDENTIALS");
    }
    // Generate JWT
    const token = (0, auth_middleware_1.generateToken)({
        userId: profile.id,
        email: profile.email,
        role: profile.role,
    });
    // Return without password hash
    const { password_hash: _, ...safeProfile } = profile;
    return { user: safeProfile, token };
};
exports.loginService = loginService;
const getMeService = async (userId) => {
    const profile = await (0, auth_repository_1.findProfileByIdRepo)(userId);
    if (!profile) {
        throw new Error("USER_NOT_FOUND");
    }
    return profile;
};
exports.getMeService = getMeService;
const updateProfileService = async (userId, data) => {
    return (0, auth_repository_1.updateProfileRepo)(userId, data);
};
exports.updateProfileService = updateProfileService;
