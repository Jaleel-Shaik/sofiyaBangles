import { getBusinessProfileDb, updateBusinessProfileDb } from "../../../db/settings.db";
import { BusinessProfile } from "../../../models/settings.model";
import { cloudinaryStorage } from "../../../integrations/storage/cloudinary.adapter";
import { BadRequestError } from "../../../core/errors/app.error";

export const getBusinessProfileService = async (): Promise<BusinessProfile> => {
  return await getBusinessProfileDb();
};

export const updateBusinessProfileService = async (
  data: Partial<BusinessProfile>
): Promise<BusinessProfile> => {
  return await updateBusinessProfileDb(data);
};

export const uploadBusinessLogoService = async (
  file: Express.Multer.File
): Promise<BusinessProfile> => {
  if (!file) throw new BadRequestError("No logo file provided.");

  const uploadResult = await cloudinaryStorage.uploadFile(file, {
    folder: "sofiya_bangles/logos",
  });

  return await updateBusinessProfileDb({ logo_url: uploadResult.url });
};
