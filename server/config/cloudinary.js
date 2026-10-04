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
 * Extract human-readable error message from any Cloudinary SDK or API error object.
 */
const getErrorMessage = (err) => {
  if (!err) return 'Unknown error during Cloudinary operation.';
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.error && typeof err.error.message === 'string') return err.error.message;
  if (err.error && typeof err.error === 'string') return err.error;
  if (err.http_code) return `Cloudinary HTTP Error ${err.http_code}`;
  try {
    const json = JSON.stringify(err);
    if (json && json !== '{}') return json;
  } catch (e) {}
  return String(err);
};

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

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  try {
    const stats = fs.statSync(filePath);
    let result;

    const commonOptions = {
      folder: 'qb_exchanger',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      timeout: 600000
    };

    // Use upload_large for files > 5 MB to avoid socket timeouts and monolithic payload limits.
    // NOTE: Cloudinary SDK v2 requires: upload_large(filePath, options, callback)
    if (stats.size > 5 * 1024 * 1024) {
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(
          filePath,
          {
            ...commonOptions,
            chunk_size: 5242880 // 5 MB chunk size (5,242,880 bytes - standard Cloudinary chunk size)
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
      });
    } else {
      result = await cloudinary.uploader.upload(filePath, {
        ...commonOptions,
        timeout: 120000
      });
    }

    if (!result || !result.secure_url) {
      throw new Error('Cloudinary upload response did not return a valid secure_url.');
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (err) {
    const detail = getErrorMessage(err);
    console.error('Cloudinary upload error details:', err);
    throw new Error(detail);
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
    const resRaw = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    if (resRaw.result !== 'ok') {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    const detail = getErrorMessage(err);
    console.error(`Failed to delete Cloudinary file (${publicId}):`, detail);
  }
};
