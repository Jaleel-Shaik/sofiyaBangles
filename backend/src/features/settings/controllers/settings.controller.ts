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

    const { v2: cloudinary } = require("cloudinary");
    const streamifier = require("streamifier");
    const { env } = require("../../shared/config/env");

    cloudinary.config({
      cloud_name: env.CLOUD_NAME,
      api_key: env.CLOUD_API_KEY,
      api_secret: env.CLOUD_API_SECRET,
    });

    const logoUrl: string = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sofiya_bangles/logos" },
        (error: any, result: any) => {
          if (result) resolve(result.secure_url);
          else reject(error);
        }
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    const updatedProfile = await updateBusinessProfileModel({ logo_url: logoUrl });

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
