import { Request, Response } from "express";
import {
  getAllModelTypesService,
  getModelTypeByIdService,
  createModelTypeService,
  updateModelTypeService,
  deleteModelTypeService,
} from "../services/modelType.service";
import { getParam } from "../../../shared/utils/params";

export const getAllModelTypes = async (_req: Request, res: Response) => {
  try {
    const data = await getAllModelTypesService();
    res.status(200).json({ success: true, data, message: "Model types fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getModelTypeById = async (req: Request, res: Response) => {
  try {
    const id = getParam(req, "id");
    const data = await getModelTypeByIdService(id);
    if (!data) return res.status(404).json({ success: false, message: "Model type not found" });
    res.status(200).json({ success: true, data, message: "Model type fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createModelType = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const data = await createModelTypeService({
      name,
    });
    res.status(201).json({ success: true, data, message: "Model type created successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateModelType = async (req: Request, res: Response) => {
  try {
    const id = getParam(req, "id");
    const data = await updateModelTypeService(id, req.body);
    res.status(200).json({ success: true, data, message: "Model type updated successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteModelType = async (req: Request, res: Response) => {
  try {
    const id = getParam(req, "id");
    await deleteModelTypeService(id);
    res.status(200).json({ success: true, message: "Model type deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
