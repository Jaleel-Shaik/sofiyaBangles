"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({
            folder: "bangles-products",
        }, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            console.log("Cloudinary upload result:", result);
            resolve(result?.secure_url || "");
        });
        streamifier_1.default.createReadStream(file.buffer).pipe(stream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
