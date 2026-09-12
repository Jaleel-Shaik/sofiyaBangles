import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  getSizePreferencesService,
  createSizePreferenceService,
  updateSizePreferenceService,
  deleteSizePreferenceService,
} from "../services/sizePreference.service";
import { NotFoundError, ForbiddenError } from "../../../core/errors/app.error";

export const getSizePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const preferences = await getSizePreferencesService(req.user!.userId);
  return sendSuccess(res, preferences);
});

export const createSizePreference = asyncHandler(async (req: AuthRequest, res: Response) => {
  const preference = await createSizePreferenceService({
    ...req.body,
    user_id: req.user!.userId,
  });
  return sendSuccess(res, preference, { message: "Size preference created successfully.", statusCode: 201 });
});

export const updateSizePreference = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const preference = await updateSizePreferenceService(id, req.user!.userId, req.body);
    return sendSuccess(res, preference, "Size preference updated successfully.");
  } catch (err: any) {
    if (err.message === "SIZE_PREFERENCE_NOT_FOUND") throw new NotFoundError("Size preference not found.");
    if (err.message === "UNAUTHORIZED_ACCESS") {
      throw new ForbiddenError("You do not have permission to modify this preference.");
    }
    throw err;
  }
});

export const deleteSizePreference = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    await deleteSizePreferenceService(id, req.user!.userId);
    return sendSuccess(res, null, "Size preference deleted successfully.");
  } catch (err: any) {
    if (err.message === "SIZE_PREFERENCE_NOT_FOUND") throw new NotFoundError("Size preference not found.");
    if (err.message === "UNAUTHORIZED_ACCESS") {
      throw new ForbiddenError("You do not have permission to delete this preference.");
    }
    throw err;
  }
});
