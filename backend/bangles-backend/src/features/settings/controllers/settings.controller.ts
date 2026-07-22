import { Request, Response } from "express";
import { getBusinessProfileModel, updateBusinessProfileModel } from "../models/settings.model";
import { ApiResponse, BusinessProfile } from "../../../shared/types";

export const getBusinessProfile = async (
  req: Request,
  res: Response<ApiResponse<BusinessProfile>>,
) => {
  try {
    const profile = await getBusinessProfileModel();
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
    
    // In a real app, we'd add validation here (Zod, etc.)
    const updatedProfile = await updateBusinessProfileModel(data);
    
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
