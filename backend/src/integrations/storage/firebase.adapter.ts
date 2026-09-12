import { extname } from "path";
import * as admin from "firebase-admin";
import { IStorageProvider, UploadOptions, UploadResult } from "./storage.interface";
import { BadRequestError } from "../../core/errors/app.error";

export class FirebaseStorageAdapter implements IStorageProvider {
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const bucket = admin.storage().bucket();
    const folder = options?.folder || "uploads";
    const ext = extname(originalName);
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const fileRef = bucket.file(fileName);

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await fileRef.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;

    return {
      url,
      publicId: fileName,
      format: ext.replace(".", ""),
      bytes: buffer.length,
    };
  }

  async uploadFile(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestError("No file buffer provided for upload.");
    }
    return this.uploadBuffer(file.buffer, file.originalname, file.mimetype, options);
  }

  async deleteFile(publicIdOrUrl: string): Promise<boolean> {
    try {
      const bucket = admin.storage().bucket();
      const fileRef = bucket.file(publicIdOrUrl);
      await fileRef.delete();
      return true;
    } catch {
      return false;
    }
  }
}

export const firebaseStorage = new FirebaseStorageAdapter();
