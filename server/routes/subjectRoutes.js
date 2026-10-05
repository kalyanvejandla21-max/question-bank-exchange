import express from 'express';
import { store } from '../data/store.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { deleteFromGridFS } from '../config/gridfs.js';

const router = express.Router();

const cleanupResourceStorage = async (resItem) => {
  if (!resItem) return;
  if (resItem.storageProvider === 'gridfs' || resItem.gridfsId) {
    const gId = resItem.gridfsId || (resItem.fileUrl ? resItem.fileUrl.split('/file/')[1] : null);
    if (gId) {
      try {
        await deleteFromGridFS(gId);
      } catch (err) {
        console.error(`[Subject Delete] GridFS cleanup error for ${resItem.id}:`, err.message);
      }
    }
  } else if (resItem.cloudinaryPublicId) {
    try {
      await deleteFromCloudinary(resItem.cloudinaryPublicId);
    } catch (err) {
      console.error(`[Subject Delete] Cloudinary cleanup error for ${resItem.id}:`, err.message);
    }
  }
};

// GET /api/subjects?semester=3-1
router.get('/', (req, res) => {
  try {
    const { semester } = req.query;
    const subjects = store.getSubjects(semester);
    const resources = store.getResources({});

    const enriched = subjects.map(subj => {
      const subjResources = resources.filter(r => r.subjectId === subj.id);
      return {
        ...subj,
        resourceCount: subjResources.length
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/subjects/:id
router.get('/:id', (req, res) => {
  try {
    const subj = store.getSubjectById(req.params.id);
    if (!subj) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    const resources = store.getResources({ subjectId: subj.id });
    res.json({ success: true, data: { ...subj, resourceCount: resources.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subjects (Create subject)
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const { name, code, semester } = req.body;
    if (!name || !semester) {
      return res.status(400).json({ success: false, message: 'Subject name and semester are required' });
    }
    const newSubject = await store.addSubject({ name, code, semester });
    res.status(201).json({ success: true, data: newSubject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subjects/bulk-delete (Admin bulk delete subject)
router.post('/bulk-delete', requireAdminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No subject IDs provided for deletion' });
    }
    const result = await store.deleteSubjectsBatch(ids);
    if (Array.isArray(result.deletedResources)) {
      for (const resItem of result.deletedResources) {
        await cleanupResourceStorage(resItem);
      }
    }
    res.json({
      success: true,
      count: result.count,
      deletedResourcesCount: result.deletedResourcesCount,
      message: `${result.count} subject(s) and ${result.deletedResourcesCount} associated PDF(s) deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/subjects/:id (Admin single delete subject)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const result = await store.deleteSubject(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (Array.isArray(result.deletedResources)) {
      for (const resItem of result.deletedResources) {
        await cleanupResourceStorage(resItem);
      }
    }
    res.json({
      success: true,
      message: `Subject deleted successfully along with ${result.deletedResourcesCount} associated resource(s).`,
      deletedResourcesCount: result.deletedResourcesCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
