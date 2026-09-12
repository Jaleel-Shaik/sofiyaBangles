/**
 * Feature Model: Settings
 * Re-exports pure data models from src/models/settings.model
 * Re-exports database operations from src/db/settings.db for backward-compatible module resolution.
 */

export * from "../../../models/settings.model";
import {
  getBusinessProfileDb,
  updateBusinessProfileDb,
} from "../../../db/settings.db";

export {
  getBusinessProfileDb as getBusinessProfileModel,
  updateBusinessProfileDb as updateBusinessProfileModel,
};
