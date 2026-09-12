import { getBusinessProfileDb, updateBusinessProfileDb } from "../../../db/settings.db";
import { BusinessProfile } from "../../../models/settings.model";
import { env } from "../../../shared/config/env";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

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

  return await updateBusinessProfileDb({ logo_url: logoUrl });
};
