import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { store } from '../data/store.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

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
  upload.single('pdfFile')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size exceeds the 25 MB limit.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Only PDF files are allowed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file selected for upload.' });
    }

    try {
      const { name, semester, subjectId, category } = req.body;

      if (!name || !semester || !subjectId || !category) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ success: false, message: 'Please provide name, semester, subject, and category.' });
      }

      const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(1);
      const fileSize = req.file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(req.file.size / 1024)} KB`;

      let fileUrl = `/uploads/${req.file.filename}`;
      let cloudinaryPublicId = null;

      if (isCloudinaryConfigured()) {
        try {
          const cldRes = await uploadToCloudinary(req.file.path, req.file.originalname);
          fileUrl = cldRes.secure_url;
          cloudinaryPublicId = cldRes.public_id;
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
      }

      const newResource = store.addResource({
        name: name.trim(),
        semester,
        subjectId,
        category,
        fileName: req.file.filename,
        fileUrl,
        fileSize,
        filePath: req.file.path,
        cloudinaryPublicId
      });

      // Delete temporary local file after saving resource metadata
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }

      res.status(201).json({
        success: true,
        message: 'PDF uploaded successfully!',
        data: newResource
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
    const removedList = store.deleteResourcesBatch(ids);
    for (const item of removedList) {
      if (item && item.cloudinaryPublicId) {
        await deleteFromCloudinary(item.cloudinaryPublicId);
      }
    }
    res.json({
      success: true,
      count: removedList.length,
      message: `${removedList.length} resource(s) deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/resources/:id (Admin single delete)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const deleted = store.deleteResource(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    if (deleted.cloudinaryPublicId) {
      await deleteFromCloudinary(deleted.cloudinaryPublicId);
    }
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
