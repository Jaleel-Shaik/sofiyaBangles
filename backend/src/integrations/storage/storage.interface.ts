export interface UploadResult {
  url: string;
  publicId?: string;
  format?: string;
  bytes?: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: Record<string, unknown>[];
  allowedFormats?: string[];
}

export interface IStorageProvider {
  uploadFile(file: Express.Multer.File, options?: UploadOptions): Promise<UploadResult>;
  uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, options?: UploadOptions): Promise<UploadResult>;
  deleteFile(publicIdOrUrl: string): Promise<boolean>;
}
