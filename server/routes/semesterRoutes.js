import express from 'express';
import { store } from '../data/store.js';

const router = express.Router();

// GET /api/semesters
router.get('/', (req, res) => {
  try {
    const semesters = store.getSemesters();
    const subjects = store.getSubjects();
    const resources = store.getResources({});

    // Attach subject & PDF counts to each semester
    const enriched = semesters.map(sem => {
      const semSubjects = subjects.filter(s => s.semester === sem.name);
      const semResources = resources.filter(r => r.semester === sem.name);
      return {
        ...sem,
        subjectCount: semSubjects.length,
        resourceCount: semResources.length
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/semesters (Admin)
router.post('/', (req, res) => {
  try {
    const { name, title, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Semester name is required' });
    }
    const newSem = store.addSemester({ name, title, description });
    res.status(201).json({ success: true, data: newSem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
