import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { store } from '../data/store.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { uploadToR2, deleteFromR2, isR2Configured } from '../config/r2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Config
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
    cb(new Error('Please upload a PDF file.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB Limit
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

// POST /api/resources/upload
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

    try {
      const { name, semester, subjectId, category } = req.body;

      if (!name || !semester || !subjectId || !category) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, message: 'Please provide name, semester, subject, and category.' });
      }

      // Pre-flight duplicate check BEFORE cloud upload to save network overhead on duplicates
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

      const TEN_MB_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes (10 MiB)
      const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2);
      const fileSize = req.file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(req.file.size / 1024)} KB`;

      let fileUrl = null;
      let cloudinaryPublicId = null;
      let r2Key = null;
      let storageProvider = 'cloudinary';

      const storageStart = Date.now();

      if (req.file.size <= TEN_MB_BYTES) {
        // Files <= 10 MiB -> Cloudinary
        console.log(`[UPLOAD] Cloudinary upload started for "${req.file.originalname}" (${fileSizeMb} MB)`);
        if (!isCloudinaryConfigured()) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
          }
          return res.status(500).json({
            success: false,
            message: 'Cloudinary storage is not configured. Upload requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
          });
        }

        try {
          const cldRes = await uploadToCloudinary(req.file.path, req.file.originalname);
          fileUrl = cldRes?.secure_url;
          cloudinaryPublicId = cldRes?.public_id;
          storageProvider = 'cloudinary';
        } catch (cldErr) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
          }
          const errMsg = cldErr?.message || 'Cloudinary upload failed.';
          return res.status(500).json({
            success: false,
            message: `Cloudinary Storage Error: ${errMsg}`
          });
        }
      } else {
        // Files > 10 MiB and <= 25 MB -> Cloudflare R2
        console.log(`[UPLOAD] Cloudflare R2 upload started for "${req.file.originalname}" (${fileSizeMb} MB)`);
        if (!isR2Configured()) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
          }
          return res.status(500).json({
            success: false,
            message: 'Cloudflare R2 storage is required for files above 10 MB (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL are missing).'
          });
        }

        try {
          const r2Res = await uploadToR2(req.file.path, req.file.originalname);
          fileUrl = r2Res?.secure_url;
          r2Key = r2Res?.key;
          cloudinaryPublicId = null;
          storageProvider = 'r2';
        } catch (r2Err) {
          if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
          }
          const errMsg = r2Err?.message || 'Cloudflare R2 upload failed.';
          return res.status(500).json({
            success: false,
            message: `Cloudflare R2 Storage Error: ${errMsg}`
          });
        }
      }

      const storageTime = Date.now() - storageStart;
      console.log(`[UPLOAD] ${storageProvider === 'r2' ? 'Cloudflare R2' : 'Cloudinary'} upload completed in ${storageTime}ms`);

      // Defensive validation: Ensure URL is a valid external HTTPS URL and never a local /uploads/ path
      if (!fileUrl || !fileUrl.startsWith('https://')) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(500).json({
          success: false,
          message: 'Upload rejected: Could not generate a valid durable HTTPS URL.'
        });
      }

      console.log(`[UPLOAD] MongoDB save started`);
      const dbStart = Date.now();

      const newResource = await store.addResource({
        name: name.trim(),
        semester,
        subjectId,
        category,
        fileName: req.file.filename,
        fileUrl,
        fileSize,
        filePath: req.file.path,
        cloudinaryPublicId,
        r2Key,
        storageProvider
      });

      const dbTime = Date.now() - dbStart;
      console.log(`[UPLOAD] MongoDB save completed in ${dbTime}ms`);

      // Delete temporary local file after saving resource metadata
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }

      const totalTime = Date.now() - reqStart;
      console.log(`[UPLOAD] Total time: ${totalTime}ms (Multer: ${multerTime}ms, Storage: ${storageTime}ms, DB: ${dbTime}ms)`);

      res.status(201).json({
        success: true,
        message: 'PDF uploaded successfully!',
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
      res.status(500).json({ success: false, message: error.message });
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);

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
    let r2SuccessCount = 0;

    for (const item of removedList) {
      if (item) {
        if (item.storageProvider === 'r2' || item.r2Key) {
          const key = item.r2Key || item.cloudinaryPublicId;
          if (key) {
            try {
              await deleteFromR2(key);
              r2SuccessCount++;
            } catch (r2Err) {
              console.error(`[Admin Bulk Delete] R2 deletion error for ${item.id}:`, r2Err.message);
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
    console.log(`[Admin Bulk Delete] Storage cleanup complete: ${cldSuccessCount} Cloudinary files, ${r2SuccessCount} R2 files cleaned up.`);

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
    if (deleted.storageProvider === 'r2' || deleted.r2Key) {
      const key = deleted.r2Key || deleted.cloudinaryPublicId;
      if (key) {
        try {
          await deleteFromR2(key);
          deleteStatus = 'r2_success';
          console.log(`[Admin Single Delete] Cloudflare R2 file ${key} cleaned up.`);
        } catch (r2Err) {
          deleteStatus = `r2_failed: ${r2Err.message}`;
          console.error(`[Admin Single Delete] Cloudflare R2 deletion error:`, r2Err.message);
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
