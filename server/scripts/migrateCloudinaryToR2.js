import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { uploadToR2, isR2Configured } from '../config/r2.js';
import { deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp_migration');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Download file from URL to local file system
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (response) => {
      // Handle HTTP redirects (301, 302, 307)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return reject(new Error(`Failed to download file: HTTP status ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch (e) {}
      reject(err);
    });

    request.setTimeout(60000, () => {
      request.destroy();
      file.close();
      try { fs.unlinkSync(destPath); } catch (e) {}
      reject(new Error('Download timed out after 60 seconds'));
    });
  });
}

export async function migrateCloudinaryToR2() {
  console.log('🚀 [Cloudinary -> R2 Migration] Starting one-time migration process...');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || !mongoUri.trim()) {
    console.error('❌ [Migration Error]: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  if (!isR2Configured()) {
    console.error('❌ [Migration Error]: Cloudflare R2 environment variables are not configured in server/.env.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  let allResources = [];
  try {
    allResources = await Resource.find({});
  } catch (err) {
    console.error('❌ Failed to fetch resources from MongoDB:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  let skippedCount = 0;
  const toMigrate = [];
  const migratedItems = [];
  const failedItems = [];

  for (const res of allResources) {
    const rawObj = typeof res.toObject === 'function' ? res.toObject() : res;
    
    // Idempotency Check: Skip if resource is already using R2
    if (rawObj.storageProvider === 'r2' && rawObj.r2Key && rawObj.fileUrl && !rawObj.fileUrl.includes('res.cloudinary.com')) {
      skippedCount++;
      continue;
    }

    // Target resources hosted on Cloudinary or explicitly marked as storageProvider = 'cloudinary'
    if (rawObj.storageProvider === 'cloudinary' || (rawObj.fileUrl && rawObj.fileUrl.includes('res.cloudinary.com')) || rawObj.cloudinaryPublicId) {
      toMigrate.push(res);
    } else {
      skippedCount++;
    }
  }

  console.log(`📊 Found ${toMigrate.length} Cloudinary resource(s) to migrate to Cloudflare R2. (Skipped ${skippedCount} already migrated or non-Cloudinary resources).`);

  let migratedCount = 0;
  let failedCount = 0;

  for (const res of toMigrate) {
    const rawObj = typeof res.toObject === 'function' ? res.toObject() : res;
    const resId = rawObj.id || rawObj._id.toString();
    const fileName = rawObj.fileName || `${rawObj.name || 'resource'}.pdf`;
    const oldPublicId = rawObj.cloudinaryPublicId;
    const oldUrl = rawObj.fileUrl;

    console.log(`\n--------------------------------------------------`);
    console.log(`📦 Processing Resource [${resId}]: "${rawObj.name || fileName}"`);
    console.log(`   Source Cloudinary URL: ${oldUrl}`);

    const tempFilePath = path.join(TEMP_DIR, `temp_${Date.now()}_${path.basename(fileName)}`);

    try {
      // Step 1: Download existing PDF from Cloudinary
      console.log(`   1. Downloading PDF from Cloudinary...`);
      await downloadFile(oldUrl, tempFilePath);
      console.log(`   ✓ Downloaded to temp path: ${tempFilePath}`);

      // Step 2: Upload PDF to Cloudflare R2
      console.log(`   2. Uploading PDF to Cloudflare R2...`);
      const r2Res = await uploadToR2(tempFilePath, fileName, {
        semester: rawObj.semester,
        subject: rawObj.subjectId
      });

      // Step 3: Verify R2 upload result
      if (!r2Res || !r2Res.secure_url || !r2Res.key || !r2Res.secure_url.startsWith('https://')) {
        throw new Error('R2 upload response was incomplete or missing valid HTTPS URL.');
      }
      console.log(`   ✓ Uploaded to R2: ${r2Res.secure_url} (Key: ${r2Res.key})`);

      // Step 4: Update MongoDB Record
      console.log(`   3. Updating MongoDB document...`);
      const updateRes = await Resource.updateOne(
        { _id: res._id },
        {
          $set: {
            storageProvider: 'r2',
            r2Key: r2Res.key,
            fileUrl: r2Res.secure_url
          }
        }
      );

      if (updateRes.modifiedCount === 0 && updateRes.matchedCount === 0) {
        throw new Error('MongoDB update failed: document matched 0 records.');
      }
      console.log(`   ✓ MongoDB updated successfully.`);

      // Step 5: Delete old Cloudinary file ONLY after DB update succeeds
      if (oldPublicId && isCloudinaryConfigured()) {
        console.log(`   4. Deleting legacy Cloudinary object [${oldPublicId}]...`);
        try {
          await deleteFromCloudinary(oldPublicId);
          console.log(`   ✓ Legacy Cloudinary file deleted.`);
        } catch (cldErr) {
          console.warn(`   ⚠️ Warning: Failed to delete legacy Cloudinary file (${oldPublicId}):`, cldErr.message);
        }
      }

      migratedCount++;
      migratedItems.push({ id: resId, name: rawObj.name, r2Key: r2Res.key, url: r2Res.secure_url });
    } catch (err) {
      failedCount++;
      console.error(`   ❌ Migration failed for resource [${resId}]: ${err.message}`);
      console.error(`   ℹ️ Database record and original Cloudinary file were NOT modified.`);
      failedItems.push({ id: resId, name: rawObj.name || fileName, reason: err.message });
    } finally {
      // Clean up local temp file
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
    }
  }

  // Cleanup temp directory
  if (fs.existsSync(TEMP_DIR)) {
    try { fs.rmdirSync(TEMP_DIR); } catch (e) {}
  }

  console.log(`\n==================================================`);
  console.log(`🎉 MIGRATION COMPLETED SUMMARY`);
  console.log(`==================================================`);
  console.log(`- Successfully Migrated: ${migratedCount}`);
  console.log(`- Skipped (Already R2):  ${skippedCount}`);
  console.log(`- Failed:                ${failedCount}`);

  if (migratedItems.length > 0) {
    console.log(`\n✓ Migrated Resources:`);
    migratedItems.forEach(item => {
      console.log(`  - [${item.id}] ${item.name} -> ${item.url}`);
    });
  }

  if (failedItems.length > 0) {
    console.log(`\n✗ Failed Resources:`);
    failedItems.forEach(item => {
      console.log(`  - [${item.id}] ${item.name}: ${item.reason}`);
    });
  }

  await mongoose.disconnect();
  console.log(`\nDisconnected from MongoDB. Done.`);
  process.exit(0);
}

// Only execute script when invoked directly from CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrateCloudinaryToR2.js')) {
  migrateCloudinaryToR2().catch(async (err) => {
    console.error('Uncaught error during migration execution:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
