import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Upload local file to Cloudinary.
 * @param {string} filePath - Absolute path to temporary local file
 * @param {string} [originalName] - Original filename
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadToCloudinary = async (filePath, originalName = '') => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
  }

  // Ensure Cloudinary is configured if variables were loaded dynamically
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'qb_exchanger',
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
};

/**
 * Delete a file from Cloudinary by public_id.
 * @param {string} publicId - Cloudinary public_id
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    if (result.result !== 'ok') {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    console.error(`Failed to delete Cloudinary file (${publicId}):`, err.message);
  }
};
