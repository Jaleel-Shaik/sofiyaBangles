/**
 * Feature Model: AdminStaff
 * Re-exports pure data models from src/models/adminStaff.model
 * Re-exports database operations from src/db/adminStaff.db for backward-compatible module resolution.
 */

export * from "../../../models/adminStaff.model";
import {
  getAllAdminsDb,
  getAdminByEmailDb,
  getAdminByIdDb,
  insertAdminDb,
  updateAdminDb,
  deleteAdminDb,
} from "../../../db/adminStaff.db";

export {
  getAllAdminsDb as getAllAdminsModel,
  getAdminByEmailDb as getAdminByEmailModel,
  getAdminByIdDb as getAdminByIdModel,
  insertAdminDb as createAdminModel,
  updateAdminDb as updateAdminModel,
  deleteAdminDb as deleteAdminModel,
};
