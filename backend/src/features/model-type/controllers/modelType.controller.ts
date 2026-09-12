import { Request, Response } from "express";
import {
  getAllModelTypesService,
  getModelTypeByIdService,
  createModelTypeService,
  updateModelTypeService,
  deleteModelTypeService,
} from "../services/modelType.service";
import { getParam } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { NotFoundError, ConflictError, BadRequestError } from "../../../core/errors/app.error";

export const getAllModelTypes = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getAllModelTypesService();
  return sendSuccess(res, data, "Model types fetched successfully");
});

export const getModelTypeById = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, "id");
  const data = await getModelTypeByIdService(id);
  if (!data) throw new NotFoundError("Model type not found");
  return sendSuccess(res, data, "Model type fetched successfully");
});

export const createModelType = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const data = await createModelTypeService({ name });
    return sendSuccess(res, data, { message: "Model type created successfully", statusCode: 201 });
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_ALREADY_EXISTS") {
      throw new ConflictError("A model type with this name already exists.", "MODEL_TYPE_ALREADY_EXISTS");
    }
    throw err;
  }
});

export const updateModelType = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, "id");
  try {
    const data = await updateModelTypeService(id, req.body);
    return sendSuccess(res, data, "Model type updated successfully");
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_ALREADY_EXISTS") {
      throw new ConflictError("A model type with this name already exists.", "MODEL_TYPE_ALREADY_EXISTS");
    }
    throw err;
  }
});

export const deleteModelType = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, "id");
  try {
    await deleteModelTypeService(id);
    return sendSuccess(res, null, "Model type deleted successfully");
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_NOT_FOUND") {
      throw new NotFoundError("Model type not found.");
    }
    if (err.message === "MODEL_HAS_DEPENDENCIES") {
      throw new ConflictError(
        `Cannot delete "${err.modelName}" because it has ${err.categoryCount} category(ies) and ${err.productCount} product(s). Archive or reassign them first.`,
        "MODEL_HAS_DEPENDENCIES"
      );
    }
    throw err;
  }
});
