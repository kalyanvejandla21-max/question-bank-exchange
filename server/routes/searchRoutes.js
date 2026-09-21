import express from 'express';
import { store } from '../data/store.js';

const router = express.Router();

// GET /api/search?q=DWDM
router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ success: true, data: { resources: [], subjects: [], query: '' } });
    }

    const resources = store.getResources({ search: q });
    const subjects = store.getSubjects().filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.code.toLowerCase().includes(q.toLowerCase()) ||
      s.semester.toLowerCase().includes(q.toLowerCase())
    );

    res.json({
      success: true,
      data: {
        query: q,
        totalResults: resources.length + subjects.length,
        resources,
        subjects
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
