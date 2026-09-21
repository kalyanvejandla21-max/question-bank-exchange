import express from 'express';
import { store } from '../data/store.js';
import { requireAdminAuth, ADMIN_TOKEN } from '../middleware/authMiddleware.js';

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2141';

// POST /api/admin/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || !username.trim() || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter username and password.'
      });
    }

    if (username.trim() === ADMIN_USERNAME && password.trim() === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        message: 'Admin login successful',
        token: ADMIN_TOKEN,
        admin: {
          username: ADMIN_USERNAME
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  }
});

// GET /api/admin/stats (Protected)
router.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const stats = store.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/reset (Protected)
router.post('/reset', requireAdminAuth, (req, res) => {
  try {
    store.resetToSeed();
    res.json({ success: true, message: 'Platform data successfully reset to initial state' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
