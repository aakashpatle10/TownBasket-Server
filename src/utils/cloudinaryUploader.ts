import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import config from '../config/environment.js';
import { AppError } from './AppError.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export type UploadedMedia = {
  url: string;
  publicId: string;
  resourceType: string;
};

const ensureCloudinaryConfigured = () => {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new AppError(500, 'Cloudinary is not configured');
  }
};

export const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  options: UploadApiOptions = {}
): Promise<UploadedMedia> => {
  ensureCloudinaryConfigured();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'quick-commerce/social',
        resource_type: 'auto',
        ...options,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }

        resolve(uploadResult);
      }
    );

    stream.end(file.buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
};

export const uploadManyToCloudinary = async (
  files: Express.Multer.File[] = [],
  options: UploadApiOptions = {}
): Promise<UploadedMedia[]> => {
  return Promise.all(files.map((file) => uploadBufferToCloudinary(file, options)));
};

