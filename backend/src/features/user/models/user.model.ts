/**
 * Feature Model: User
 * Re-exports pure data models from src/models/user.model
 * Re-exports database operations from src/db/user.db for backward-compatible module resolution.
 */

export * from "../../../models/user.model";
import {
  queryUsersDb,
  getUserByIdDb,
  updateUserRoleDb,
} from "../../../db/user.db";

export {
  queryUsersDb as getAllUsersModel,
  getUserByIdDb as getUserByIdModel,
  updateUserRoleDb as updateUserRoleModel,
};
