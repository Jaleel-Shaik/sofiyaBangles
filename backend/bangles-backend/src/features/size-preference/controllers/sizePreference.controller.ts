import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam } from "../../../shared/utils/params";
import {
  getSizePreferencesModel,
  createSizePreferenceModel,
  updateSizePreferenceModel,
  deleteSizePreferenceModel
} from "../models/sizePreference.model";

export const getSizePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const preferences = await getSizePreferencesModel(req.user!.userId);
    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error("GetSizePreferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch size preferences.",
    });
  }
};

export const createSizePreference = async (req: AuthRequest, res: Response) => {
  try {
    const preference = await createSizePreferenceModel({
      ...req.body,
      user_id: req.user!.userId
    });

    res.status(201).json({
      success: true,
      data: preference,
      message: "Size preference created successfully.",
    });
  } catch (error: any) {
    console.error("CreateSizePreference error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create size preference.",
    });
  }
};

export const updateSizePreference = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const preference = await updateSizePreferenceModel(id, req.user!.userId, req.body);

    res.json({
      success: true,
      data: preference,
      message: "Size preference updated successfully.",
    });
  } catch (error: any) {
    if (error.message === "SIZE_PREFERENCE_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Size preference not found." });
      return;
    }
    if (error.message === "UNAUTHORIZED_ACCESS") {
      res.status(403).json({ success: false, message: "You do not have permission to modify this preference." });
      return;
    }
    console.error("UpdateSizePreference error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update size preference.",
    });
  }
};

export const deleteSizePreference = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    await deleteSizePreferenceModel(id, req.user!.userId);

    res.json({
      success: true,
      message: "Size preference deleted successfully.",
    });
  } catch (error: any) {
    if (error.message === "SIZE_PREFERENCE_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Size preference not found." });
      return;
    }
    if (error.message === "UNAUTHORIZED_ACCESS") {
      res.status(403).json({ success: false, message: "You do not have permission to delete this preference." });
      return;
    }
    console.error("DeleteSizePreference error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete size preference.",
    });
  }
};
