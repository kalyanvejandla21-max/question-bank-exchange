import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

/**
 * Check if Cloudflare R2 environment variables are configured.
 */
export const isR2Configured = () => {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_BASE_URL
  );
};

let s3ClientInstance = null;

const getR2Client = () => {
  if (!s3ClientInstance) {
    if (!isR2Configured()) {
      throw new Error(
        'Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL) are missing or incomplete.'
      );
    }

    const accountId = process.env.R2_ACCOUNT_ID.trim();
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim()
      }
    });
  }
  return s3ClientInstance;
};

/**
 * Upload local file to Cloudflare R2 storage bucket.
 * @param {string} filePath - Absolute path to local temporary file
 * @param {string} [originalName] - Original filename
 * @param {object} [options] - Additional metadata for key naming (semester, subject)
 * @returns {Promise<{ secure_url: string, public_id: string, key: string }>}
 */
export const uploadToR2 = async (filePath, originalName = '', options = {}) => {
  if (!isR2Configured()) {
    throw new Error('PDF storage is temporarily unavailable. Please try again later.');
  }

  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 100000);
  const baseName = originalName || path.basename(filePath);
  const sanitizedOriginal = baseName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_');

  let key = '';
  if (options && (options.semester || options.subject)) {
    const sem = (options.semester || 'general').replace(/[^a-zA-Z0-9]/g, '');
    const subj = (options.subject || 'general').replace(/[^a-zA-Z0-9.-]/g, '_');
    key = `resources/${sem}/${subj}/${timestamp}_${randomSuffix}-${sanitizedOriginal}`;
  } else {
    key = `resources/${timestamp}_${randomSuffix}-${sanitizedOriginal}`;
  }

  let baseUrl = process.env.R2_PUBLIC_BASE_URL.trim().replace(/\/+$/, '');
  if (!baseUrl.startsWith('https://')) {
    if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    } else {
      baseUrl = `https://${baseUrl}`;
    }
  }
  const secure_url = `${baseUrl}/${key}`;

  // If testing locally with dummy R2 test credentials (R2_ACCOUNT_ID starting with 'test_')
  if (process.env.R2_ACCOUNT_ID.trim().startsWith('test_')) {
    console.log(`[R2 Test Mode] Simulated upload for ${key}`);
    return {
      secure_url,
      public_id: key,
      key
    };
  }

  const client = getR2Client();
  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME.trim(),
    Key: key,
    Body: fileStream,
    ContentLength: stats.size,
    ContentType: 'application/pdf'
  });

  await client.send(command);

  // Validate HTTPS URL
  if (!secure_url.startsWith('https://')) {
    throw new Error(`R2 upload error: Generated public URL '${secure_url}' is not a valid HTTPS URL.`);
  }

  return {
    secure_url,
    public_id: key,
    key
  };
};

/**
 * Delete a file from Cloudflare R2 storage bucket by key.
 * @param {string} key - R2 Object Key (or public_id)
 */
export const deleteFromR2 = async (key) => {
  if (!key || !isR2Configured()) return;
  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME.trim(),
      Key: key
    });
    await client.send(command);
    console.log(`🗑️ Deleted from Cloudflare R2: ${key}`);
  } catch (err) {
    console.error(`Failed to delete Cloudflare R2 object (${key}):`, err.message || err);
  }
};

