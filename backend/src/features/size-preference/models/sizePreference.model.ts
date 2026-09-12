/**
 * Feature Model: SizePreference
 * Re-exports pure data models from src/models/sizePreference.model
 * Re-exports database operations from src/db/sizePreference.db for backward-compatible module resolution.
 */

export * from "../../../models/sizePreference.model";
import {
  getSizePreferencesDb,
  getSizePreferenceByIdDb,
  insertSizePreferenceDb,
  updateSizePreferenceDocDb,
  deleteSizePreferenceDocDb,
} from "../../../db/sizePreference.db";

export {
  getSizePreferencesDb as getSizePreferencesModel,
  insertSizePreferenceDb as createSizePreferenceModel,
  updateSizePreferenceDocDb as updateSizePreferenceModel,
  deleteSizePreferenceDocDb as deleteSizePreferenceModel,
};
