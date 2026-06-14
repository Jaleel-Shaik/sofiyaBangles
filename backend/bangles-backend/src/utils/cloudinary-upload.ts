import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

export const uploadToCloudinary = (
  file: Express.Multer.File,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "bangles-products",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }


        console.log("Cloudinary upload result:", result);
        resolve(result?.secure_url || "");
      },
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};
