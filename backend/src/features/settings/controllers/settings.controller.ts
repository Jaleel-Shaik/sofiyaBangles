import { Request, Response } from "express";
import {
  getBusinessProfileService,
  updateBusinessProfileService,
  uploadBusinessLogoService,
} from "../services/settings.service";
import { BusinessProfile } from "../../../models/settings.model";
import { ApiResponse } from "../../../shared/types";

export const getBusinessProfile = async (
  req: Request,
  res: Response<ApiResponse<BusinessProfile>>,
) => {
  try {
    const profile = await getBusinessProfileService();
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error getting business profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateBusinessProfile = async (
  req: Request,
  res: Response<ApiResponse<BusinessProfile>>,
) => {
  try {
    const data = req.body;
    const updatedProfile = await updateBusinessProfileService(data);
    
    res.json({
      success: true,
      message: "Business profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating business profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update business profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const uploadBusinessLogo = async (
  req: Request,
  res: Response<ApiResponse<BusinessProfile>>,
) => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      res.status(400).json({
        success: false,
        message: "No image file provided.",
      });
      return;
    }

    const updatedProfile = await uploadBusinessLogoService(file);

    res.json({
      success: true,
      message: "Store logo uploaded successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error uploading store logo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload store logo",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
