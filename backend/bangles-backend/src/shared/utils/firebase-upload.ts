import { extname } from "path";
import * as admin from "firebase-admin";

/**
 * Uploads a file buffer to Firebase Storage.
 * @param file Express.Multer.File object
 * @returns The public URL of the uploaded file
 */
export const uploadToFirebaseStorage = async (file: Express.Multer.File): Promise<string> => {
  if (!file) throw new Error("No file provided");

  const bucket = admin.storage().bucket();
  const ext = extname(file.originalname);
  const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
  const fileRef = bucket.file(fileName);

  // Generate a random token for Firebase Storage access
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  // Construct the Firebase Storage download URL manually
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
};

export const uploadMultipleToFirebaseStorage = async (files: Express.Multer.File[]): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) => uploadToFirebaseStorage(file));
  return Promise.all(uploadPromises);
};
