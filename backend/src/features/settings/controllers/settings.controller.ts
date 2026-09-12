import { Request, Response } from "express";
import {
  getBusinessProfileService,
  updateBusinessProfileService,
  uploadBusinessLogoService,
} from "../services/settings.service";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { BadRequestError } from "../../../core/errors/app.error";

export const getBusinessProfile = asyncHandler(async (_req: Request, res: Response) => {
  const profile = await getBusinessProfileService();
  return sendSuccess(res, profile);
});

export const updateBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const updatedProfile = await updateBusinessProfileService(req.body);
  return sendSuccess(res, updatedProfile, "Business profile updated successfully");
});

export const uploadBusinessLogo = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File;
  if (!file) {
    throw new BadRequestError("No image file provided.");
  }
  const updatedProfile = await uploadBusinessLogoService(file);
  return sendSuccess(res, updatedProfile, "Store logo uploaded successfully");
});
