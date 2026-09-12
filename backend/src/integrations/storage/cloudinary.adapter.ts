import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { env } from "../../shared/config/env";
import { IStorageProvider, UploadOptions, UploadResult } from "./storage.interface";
import { BadRequestError } from "../../core/errors/app.error";

export class CloudinaryStorageAdapter implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUD_NAME,
      api_key: env.CLOUD_API_KEY,
      api_secret: env.CLOUD_API_SECRET,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const folder = options?.folder || "sofiya_bangles/general";

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          transformation: options?.transformation,
        },
        (error, result) => {
          if (error || !result) {
            return reject(new BadRequestError(`Cloudinary upload failed: ${error?.message || "Unknown error"}`));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async uploadFile(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestError("No file buffer provided for upload.");
    }
    return this.uploadBuffer(file.buffer, file.originalname, file.mimetype, options);
  }

  async deleteFile(publicIdOrUrl: string): Promise<boolean> {
    try {
      const publicId = publicIdOrUrl.includes("cloudinary.com")
        ? publicIdOrUrl.split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "")
        : publicIdOrUrl;

      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (err) {
      console.error("Failed to delete Cloudinary file:", err);
      return false;
    }
  }
}

export const cloudinaryStorage = new CloudinaryStorageAdapter();
