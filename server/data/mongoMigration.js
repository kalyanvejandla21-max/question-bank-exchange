import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resource } from '../models/Resource.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

export const migrateMongoFilesToCloudinary = async () => {
  console.log('[Production Migration] MongoDB mode detected');

  if (!isCloudinaryConfigured()) {
    console.warn('[Production Migration] Cloudinary is not configured. Skipping MongoDB migration.');
    return { migratedCount: 0, skippedCount: 0, failedCount: 0 };
  }

  let allResources = [];
  try {
    allResources = await Resource.find({});
  } catch (err) {
    console.error('[Production Migration] Failed to query MongoDB resources:', err.message);
    return { migratedCount: 0, skippedCount: 0, failedCount: 1 };
  }

  let skippedCount = 0;
  const toMigrate = [];

  for (const res of allResources) {
    const rawObj = typeof res.toObject === 'function' ? res.toObject() : res;
    let fileUrl = rawObj.fileUrl || '';

    // Clean up legacy malformed URLs that prepended localhost to a Cloudinary URL
    if (fileUrl.includes('res.cloudinary.com')) {
      const match = fileUrl.match(/(https:\/\/res\.cloudinary\.com\/[^\s"']+)/);
      if (match && match[1]) {
        if (fileUrl !== match[1]) {
          await Resource.updateOne({ _id: res._id }, { $set: { fileUrl: match[1] } });
        }
        skippedCount++;
        continue;
      }
    }

    // Skip if already hosted on Cloudinary or has cloudinaryPublicId with HTTPS URL
    if (fileUrl.startsWith('https://res.cloudinary.com/') || (rawObj.cloudinaryPublicId && fileUrl.startsWith('https://'))) {
      skippedCount++;
      continue;
    }

    // Skip valid external HTTPS/HTTP URLs (e.g. S3, external storage), unless it contains /uploads/ or localhost
    if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !fileUrl.includes('localhost') && !fileUrl.includes('/uploads/')) {
      skippedCount++;
      continue;
    }

    // Target local /uploads paths or localhost /uploads paths
    if (fileUrl.startsWith('/uploads/') || fileUrl.includes('/uploads/') || fileUrl.includes('localhost')) {
      toMigrate.push(res);
    } else {
      toMigrate.push(res);
    }
  }

  console.log(`[Production Migration] Found ${toMigrate.length} resources using local /uploads paths`);

  let migratedCount = 0;
  let failedCount = 0;

  for (const res of toMigrate) {
    const rawObj = typeof res.toObject === 'function' ? res.toObject() : res;
    let fileName = rawObj.fileName;

    if (!fileName && rawObj.fileUrl) {
      try {
        const cleanUrl = rawObj.fileUrl.split('?')[0];
        fileName = path.basename(cleanUrl);
      } catch (e) {
        fileName = null;
      }
    }

    if (!fileName) {
      console.warn(`[Production Migration] Missing fileName for resource "${rawObj.name || rawObj.title || rawObj.id || res._id}". Skipping.`);
      failedCount++;
      continue;
    }

    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`[Production Migration] Local file not found: ${fileName}`);
      failedCount++;
      continue;
    }

    try {
      console.log(`[Production Migration] Uploading ${fileName}`);
      const cldRes = await uploadToCloudinary(filePath, fileName);
      console.log(`[Production Migration] Uploaded successfully`);

      const updateFields = {
        fileUrl: cldRes.secure_url,
        cloudinaryPublicId: cldRes.public_id,
        fileName: fileName
      };

      await Resource.updateOne({ _id: res._id }, { $set: updateFields });
      
      const resIdentifier = rawObj.id || rawObj._id.toString();
      console.log(`[Production Migration] Updated MongoDB resource ${resIdentifier}`);
      migratedCount++;
    } catch (err) {
      console.error(`[Production Migration] Upload failed for "${rawObj.name || rawObj.title || fileName}" (${fileName}): ${err.message}`);
      failedCount++;
    }
  }

  console.log(`[Production Migration] Completed: ${migratedCount} migrated, ${skippedCount} skipped, ${failedCount} failed`);
  return { migratedCount, skippedCount, failedCount };
};
