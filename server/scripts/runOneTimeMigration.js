import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runOneTimeMigration() {
  console.log('[Local Production Migration] Connecting to MongoDB');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || !mongoUri.trim()) {
    console.error('[Local Production Migration] Error: MONGODB_URI environment variable is not set in server/.env');
    process.exit(1);
  }

  if (!isCloudinaryConfigured()) {
    console.error('[Local Production Migration] Error: Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('[Local Production Migration] Connected to MongoDB Atlas successfully');
  } catch (err) {
    console.error('[Local Production Migration] Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }

  let allResources = [];
  try {
    allResources = await Resource.find({});
  } catch (err) {
    console.error('[Local Production Migration] Failed to fetch MongoDB resources:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  let skippedCount = 0;
  const toMigrate = [];
  const migratedItems = [];
  const failedItems = [];

  for (const res of allResources) {
    const rawObj = typeof res.toObject === 'function' ? res.toObject() : res;
    let fileUrl = rawObj.fileUrl || '';

    // Clean legacy malformed localhost+cloudinary URLs if present
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

    // Skip resources already migrated to Cloudinary
    if (fileUrl.startsWith('https://res.cloudinary.com/') || (rawObj.cloudinaryPublicId && fileUrl.startsWith('https://'))) {
      skippedCount++;
      continue;
    }

    // Skip valid external HTTPS URLs (excluding localhost or /uploads/)
    if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !fileUrl.includes('localhost') && !fileUrl.includes('/uploads/')) {
      skippedCount++;
      continue;
    }

    // Select resources requiring migration
    if (fileUrl.startsWith('/uploads/') || fileUrl.includes('/uploads/') || fileUrl.includes('localhost')) {
      toMigrate.push(res);
    } else {
      toMigrate.push(res);
    }
  }

  console.log(`[Local Production Migration] Found ${toMigrate.length} resources requiring migration`);

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
      console.warn(`[Local Production Migration] Missing fileName for resource "${rawObj.name || rawObj.title || rawObj.id || res._id}". Skipping.`);
      failedItems.push({ fileName: 'Unknown', reason: 'Missing fileName in resource metadata' });
      failedCount++;
      continue;
    }

    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`[Local Production Migration] Local file not found: ${fileName}`);
      failedItems.push({ fileName, reason: `Local file not found in server/uploads/${fileName}` });
      failedCount++;
      continue;
    }

    try {
      console.log(`[Local Production Migration] Uploading ${fileName}`);
      const cldRes = await uploadToCloudinary(filePath, fileName);
      console.log(`[Local Production Migration] Uploaded successfully`);

      const updateFields = {
        fileUrl: cldRes.secure_url,
        cloudinaryPublicId: cldRes.public_id,
        fileName: fileName
      };

      await Resource.updateOne({ _id: res._id }, { $set: updateFields });

      const resIdentifier = rawObj.id || rawObj._id.toString();
      console.log(`[Local Production Migration] Updated MongoDB resource ${resIdentifier}`);
      migratedItems.push(fileName);
      migratedCount++;
    } catch (err) {
      console.error(`[Local Production Migration] Upload failed for ${fileName}: ${err.message}`);
      failedItems.push({ fileName, reason: err.message });
      failedCount++;
    }
  }

  console.log(`[Local Production Migration] Completed: ${migratedCount} migrated, ${skippedCount} skipped, ${failedCount} failed`);

  console.log('\n--- FINAL MIGRATION REPORT ---');
  console.log(`- Number Migrated: ${migratedCount}`);
  console.log(`- Number Skipped:  ${skippedCount}`);
  console.log(`- Number Failed:   ${failedCount}`);

  console.log('\n- Migrated Filenames:');
  if (migratedItems.length === 0) {
    console.log('  (None)');
  } else {
    migratedItems.forEach(fn => console.log(`  ✓ ${fn}`));
  }

  console.log('\n- Failed Filenames & Reasons:');
  if (failedItems.length === 0) {
    console.log('  (None)');
  } else {
    failedItems.forEach(item => console.log(`  ✗ ${item.fileName}: ${item.reason}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

runOneTimeMigration().catch(async (err) => {
  console.error('[Local Production Migration] Unexpected error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
