import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { store } from '../data/store.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { uploadToGridFS, deleteFromGridFS, getGridFSBucket, getGridFSFileDoc } from '../config/gridfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Disk Storage Configuration for incoming temporary upload chunks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

const fileFilter = (req, file, cb) => {
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
  const isPdfMime = file.mimetype === 'application/pdf';

  if (isPdfExt && isPdfMime) {
    cb(null, true);
  } else {
    cb(new Error('Please upload a valid PDF file.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB Application Limit
});

const router = express.Router();

// GET /api/resources
router.get('/', (req, res) => {
  try {
    const { subjectId, semester, category, search } = req.query;
    const resources = store.getResources({ subjectId, semester, category, search });
    res.json({ success: true, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/resources/reports/all (Admin - Get all reports)
router.get('/reports/all', requireAdminAuth, (req, res) => {
  try {
    const reports = store.getReports();
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/resources/file/:gridfsId (Stream GridFS PDF File directly for Preview/View)
router.get('/file/:gridfsId', async (req, res) => {
  try {
    const { gridfsId } = req.params;

    if (!gridfsId || !mongoose.Types.ObjectId.isValid(gridfsId)) {
      return res.status(400).json({ success: false, message: 'Invalid GridFS file ID format.' });
    }

    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ success: false, message: 'Database storage service is unavailable.' });
    }

    const fileDoc = await getGridFSFileDoc(gridfsId);
    if (!fileDoc) {
      return res.status(404).json({ success: false, message: 'PDF file not found in database.' });
    }

    const filename = fileDoc.filename || 'document.pdf';
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', fileDoc.contentType || 'application/pdf');
    res.setHeader('Content-Length', fileDoc.length);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const downloadStream = bucket.openDownloadStream(fileDoc._id);

    downloadStream.on('error', (err) => {
      console.error(`[GridFS Stream Error] Failed to stream file ${gridfsId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming PDF file.' });
      }
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('[GridFS File Route Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message || 'Error processing GridFS file request' });
    }
  }
});

// GET /api/resources/:id
router.get('/:id', (req, res) => {
  try {
    const resource = store.getResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data: resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/resources/upload (Upload PDF file directly to MongoDB GridFS)
router.post('/upload', (req, res) => {
  const reqStart = Date.now();
  console.log(`[UPLOAD] Request received at ${new Date().toISOString()}`);

  upload.single('pdfFile')(req, res, async (err) => {
    const multerTime = Date.now() - reqStart;
    console.log(`[UPLOAD] File received (Multer processing time: ${multerTime}ms)`);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size must be 25 MB or less.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Only PDF files are allowed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file selected for upload.' });
    }

    const MAX_25MB_BYTES = 25 * 1024 * 1024;
    if (req.file.size > MAX_25MB_BYTES) {
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({ success: false, message: 'File size must be 25 MB or less.' });
    }

    let uploadedGridFSId = null;

    try {
      const { name, semester, subjectId, category } = req.body;

      if (!name || !semester || !subjectId || !category) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, message: 'Please provide name, semester, subject, and category.' });
      }

      // Pre-flight duplicate check BEFORE storage upload
      const duplicate = store.checkDuplicateResource({ name, semester });
      if (duplicate) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({
          success: false,
          isDuplicate: true,
          message: `This PDF already exists: "${duplicate.name || duplicate.title}" (${duplicate.semester})`,
          existingResource: duplicate
        });
      }

      const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2);
      const fileSize = req.file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(req.file.size / 1024)} KB`;

      const storageStart = Date.now();
      console.log(`[UPLOAD] MongoDB GridFS stream upload started for "${req.file.originalname}" (${fileSizeMb} MB)`);

      // Upload temporary local file stream to MongoDB GridFS
      let gridfsRes;
      try {
        gridfsRes = await uploadToGridFS(req.file.path, req.file.originalname, {
          semester,
          subjectId,
          category,
          name: name.trim()
        });
        uploadedGridFSId = gridfsRes.gridfsId;
      } catch (gridfsErr) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        console.error('[UPLOAD ERROR] MongoDB GridFS upload error:', gridfsErr);
        return res.status(500).json({
          success: false,
          message: `GridFS Upload Error: ${gridfsErr.message || 'Database storage error.'}`
        });
      }

      const storageTime = Date.now() - storageStart;
      console.log(`[UPLOAD] MongoDB GridFS stream upload completed in ${storageTime}ms (GridFS ID: ${uploadedGridFSId})`);

      // Construct application resource endpoint URL
      const relativeFileUrl = `/api/resources/file/${uploadedGridFSId}`;

      console.log(`[UPLOAD] MongoDB Resource record save started`);
      const dbStart = Date.now();

      let newResource;
      try {
        newResource = await store.addResource({
          name: name.trim(),
          semester,
          subjectId,
          category,
          fileName: req.file.originalname || req.file.filename,
          fileUrl: relativeFileUrl,
          fileSize,
          filePath: req.file.path,
          gridfsId: uploadedGridFSId,
          storageProvider: 'gridfs'
        });
      } catch (dbErr) {
        // ROLLBACK: Delete newly-created GridFS file if Resource metadata creation fails
        console.error('[UPLOAD ERROR] Metadata creation failed. Rolling back GridFS object:', dbErr);
        if (uploadedGridFSId) {
          try { await deleteFromGridFS(uploadedGridFSId); } catch (e) {}
        }
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        throw dbErr;
      }

      const dbTime = Date.now() - dbStart;
      console.log(`[UPLOAD] MongoDB Resource record save completed in ${dbTime}ms`);

      // Delete temporary local file after saving resource metadata
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }

      const totalTime = Date.now() - reqStart;
      console.log(`[UPLOAD] Total time: ${totalTime}ms (Multer: ${multerTime}ms, Storage: ${storageTime}ms, DB: ${dbTime}ms)`);

      res.status(201).json({
        success: true,
        message: 'PDF uploaded successfully to MongoDB GridFS!',
        data: newResource,
        timing: {
          multerMs: multerTime,
          storageMs: storageTime,
          mongoDbMs: dbTime,
          totalMs: totalTime
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }

      if (error.isDuplicate) {
        return res.status(400).json({
          success: false,
          isDuplicate: true,
          message: error.message,
          existingResource: error.existingResource
        });
      }

      console.error('[UPLOAD ERROR] Unexpected upload handler exception:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload PDF resource.'
      });
    }
  });
});

// POST /api/resources/:id/report (User report broken PDF)
router.post('/:id/report', (req, res) => {
  try {
    const { reason, message } = req.body || {};
    const report = store.addReport({
      resourceId: req.params.id,
      reason,
      userMessage: message
    });

    res.json({
      success: true,
      message: 'Thank you. The issue has been reported to the administrator.',
      data: report
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/resources/reports/:reportId (Admin update report status)
router.put('/reports/:reportId', requireAdminAuth, (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Reviewed', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status' });
    }
    const updatedReport = store.updateReportStatus(req.params.reportId, status);
    if (!updatedReport) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({
      success: true,
      message: `Report status updated to ${status}`,
      data: updatedReport
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/resources/:id/download
router.post('/:id/download', (req, res) => {
  try {
    const updated = store.incrementDownload(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, downloadsCount: updated.downloadsCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/resources/:id/download-file (Direct attachment download endpoint)
router.get('/:id/download-file', async (req, res) => {
  try {
    const resource = store.getResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    store.incrementDownload(req.params.id);

    const fileName = resource.fileName || `${resource.name || 'document'}.pdf`;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Handle GridFS resources directly
    if (resource.storageProvider === 'gridfs' || resource.gridfsId) {
      const gridfsId = resource.gridfsId || (resource.fileUrl ? resource.fileUrl.split('/file/')[1] : null);
      if (gridfsId && mongoose.Types.ObjectId.isValid(gridfsId)) {
        const bucket = getGridFSBucket();
        const fileDoc = await getGridFSFileDoc(gridfsId);

        if (bucket && fileDoc) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
          res.setHeader('Content-Length', fileDoc.length);

          const downloadStream = bucket.openDownloadStream(fileDoc._id);
          return downloadStream.pipe(res);
        }
      }
    }

    // Handle Legacy Cloudinary resources
    if (resource.fileUrl && resource.fileUrl.startsWith('https://res.cloudinary.com/')) {
      const cldUrl = resource.fileUrl.includes('/upload/') && !resource.fileUrl.includes('/fl_attachment/')
        ? resource.fileUrl.replace('/upload/', '/upload/fl_attachment/')
        : resource.fileUrl;
      return res.redirect(cldUrl);
    } else if (resource.fileUrl && resource.fileUrl.startsWith('https://')) {
      return res.redirect(resource.fileUrl);
    } else {
      const filePath = path.join(UPLOADS_DIR, resource.fileName);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        return res.download(filePath, sanitizedFileName);
      }
      return res.status(404).json({ success: false, message: 'PDF file not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/resources/:id (Admin update)
router.put('/:id', requireAdminAuth, (req, res) => {
  try {
    const { name, category, subjectId } = req.body;
    const updated = store.updateResource(req.params.id, { name, category, subjectId });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data: updated, message: 'Resource updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/resources/bulk-delete (Admin bulk delete)
router.post('/bulk-delete', requireAdminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No resource IDs provided for deletion' });
    }

    console.log(`[Admin Bulk Delete] Received ${ids.length} resource IDs for deletion:`, ids);
    const removedList = await store.deleteResourcesBatch(ids);
    console.log(`[Admin Bulk Delete] Database deletion complete: ${removedList.length} of ${ids.length} removed.`);

    let cldSuccessCount = 0;
    let gridfsSuccessCount = 0;

    for (const item of removedList) {
      if (item) {
        if (item.storageProvider === 'gridfs' || item.gridfsId) {
          const gId = item.gridfsId || (item.fileUrl ? item.fileUrl.split('/file/')[1] : null);
          if (gId) {
            try {
              await deleteFromGridFS(gId);
              gridfsSuccessCount++;
            } catch (gridfsErr) {
              console.error(`[Admin Bulk Delete] GridFS deletion error for ${item.id}:`, gridfsErr.message);
            }
          }
        } else if (item.cloudinaryPublicId) {
          try {
            await deleteFromCloudinary(item.cloudinaryPublicId);
            cldSuccessCount++;
          } catch (cldErr) {
            console.error(`[Admin Bulk Delete] Cloudinary deletion error for ${item.id}:`, cldErr.message);
          }
        }
      }
    }
    console.log(`[Admin Bulk Delete] Storage cleanup complete: ${cldSuccessCount} Cloudinary files, ${gridfsSuccessCount} GridFS files cleaned up.`);

    res.json({
      success: true,
      count: removedList.length,
      requestedCount: ids.length,
      message: `${removedList.length} resource(s) deleted successfully`
    });
  } catch (err) {
    console.error('[Admin Bulk Delete Error]:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to bulk delete resources' });
  }
});

// DELETE /api/resources/:id (Admin single delete)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const resourceId = req.params.id;
    console.log(`[Admin Single Delete] Received resource ID: ${resourceId}`);

    const deleted = await store.deleteResource(resourceId);
    if (!deleted) {
      console.warn(`[Admin Single Delete] Resource ${resourceId} not found in database`);
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    console.log(`[Admin Single Delete] Resource ${resourceId} ("${deleted.name || deleted.title || ''}") deleted from database.`);

    let deleteStatus = 'N/A';
    if (deleted.storageProvider === 'gridfs' || deleted.gridfsId) {
      const gId = deleted.gridfsId || (deleted.fileUrl ? deleted.fileUrl.split('/file/')[1] : null);
      if (gId) {
        try {
          await deleteFromGridFS(gId);
          deleteStatus = 'gridfs_success';
          console.log(`[Admin Single Delete] MongoDB GridFS file ${gId} cleaned up.`);
        } catch (gridfsErr) {
          deleteStatus = `gridfs_failed: ${gridfsErr.message}`;
          console.error(`[Admin Single Delete] MongoDB GridFS deletion error:`, gridfsErr.message);
        }
      }
    } else if (deleted.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(deleted.cloudinaryPublicId);
        deleteStatus = 'cloudinary_success';
        console.log(`[Admin Single Delete] Cloudinary file ${deleted.cloudinaryPublicId} cleaned up.`);
      } catch (cldErr) {
        deleteStatus = `cloudinary_failed: ${cldErr.message}`;
        console.error(`[Admin Single Delete] Cloudinary deletion error:`, cldErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Resource deleted successfully',
      data: deleted,
      deleteStatus
    });
  } catch (err) {
    console.error('[Admin Single Delete Error]:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete resource' });
  }
});

export default router;
