import mongoose from 'mongoose';
import fs from 'fs';

let gridfsBucket = null;

/**
 * Returns the native MongoDB GridFSBucket instance using the current Mongoose connection.
 * Dedicated bucket name: 'pdfs' (creates pdfs.files and pdfs.chunks)
 */
export const getGridFSBucket = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return null;
  }
  if (!gridfsBucket) {
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'pdfs'
    });
  }
  return gridfsBucket;
};

/**
 * Upload a temporary local file stream directly to MongoDB GridFS.
 * @param {string} filePath - Absolute path to temporary local file
 * @param {string} originalName - Original filename
 * @param {object} [metadata={}] - Metadata fields (semester, subject, category, name)
 * @returns {Promise<{ gridfsId: mongoose.Types.ObjectId, filename: string }>}
 */
export const uploadToGridFS = (filePath, originalName, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    if (!bucket) {
      return reject(new Error('MongoDB connection is not active for GridFS upload.'));
    }

    const sanitizedName = (originalName || 'file.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');

    const uploadStream = bucket.openUploadStream(sanitizedName, {
      contentType: 'application/pdf',
      metadata: {
        ...metadata,
        uploadedAt: new Date()
      }
    });

    const readStream = fs.createReadStream(filePath);

    let isResolved = false;
    const handleSuccess = () => {
      if (!isResolved) {
        isResolved = true;
        resolve({
          gridfsId: uploadStream.id,
          filename: uploadStream.filename
        });
      }
    };

    const handleError = (err) => {
      if (!isResolved) {
        isResolved = true;
        try { uploadStream.destroy(); } catch (e) {}
        reject(err);
      }
    };

    readStream.on('error', handleError);
    uploadStream.on('error', handleError);
    uploadStream.on('finish', handleSuccess);
    uploadStream.on('close', handleSuccess);

    readStream.pipe(uploadStream);
  });
};

/**
 * Delete a file from MongoDB GridFS by gridfsId (and all associated pdfs.chunks).
 * @param {string|mongoose.Types.ObjectId} gridfsId - GridFS file ObjectId
 */
export const deleteFromGridFS = async (gridfsId) => {
  if (!gridfsId) return;
  const bucket = getGridFSBucket();
  if (!bucket) {
    console.warn(`[GridFS Delete Warning] Cannot delete GridFS object ${gridfsId}: MongoDB not connected.`);
    return;
  }
  try {
    const objectId = typeof gridfsId === 'string' ? new mongoose.Types.ObjectId(gridfsId) : gridfsId;
    await bucket.delete(objectId);
    console.log(`🗑️ Deleted from GridFS: ${gridfsId}`);
  } catch (err) {
    if (err.message && err.message.includes('FileNotFound')) {
      console.warn(`[GridFS Delete] File ${gridfsId} was already removed or not found in GridFS.`);
    } else {
      console.error(`[GridFS Delete Error] Failed to delete file (${gridfsId}):`, err.message || err);
    }
  }
};

/**
 * Find GridFS file metadata record from pdfs.files collection.
 * @param {string|mongoose.Types.ObjectId} gridfsId
 */
export const getGridFSFileDoc = async (gridfsId) => {
  const bucket = getGridFSBucket();
  if (!bucket) return null;

  try {
    const objectId = typeof gridfsId === 'string' ? new mongoose.Types.ObjectId(gridfsId) : gridfsId;
    const files = await bucket.find({ _id: objectId }).toArray();
    return (files && files.length > 0) ? files[0] : null;
  } catch (err) {
    return null;
  }
};
