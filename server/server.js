import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import semesterRoutes from './routes/semesterRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import { store } from './data/store.js';
import { isCloudinaryConfigured } from './config/cloudinary.js';
import { migrateMongoFilesToCloudinary } from './data/mongoMigration.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve Uploaded Files Statically
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/semesters', semesterRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Question Bank Exchange API',
    time: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Database & Migration Initialization
if (process.env.MONGODB_URI) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Database');
    await store.syncWithMongo();
    if (isCloudinaryConfigured()) {
      await migrateMongoFilesToCloudinary();
      await store.syncWithMongo();
    }
  } catch (err) {
    console.warn('⚠️ MongoDB Connection warning (Using file database fallback):', err.message);
    if (isCloudinaryConfigured()) {
      await store.migrateLocalFilesToCloudinary();
    }
  }
} else {
  console.log('ℹ️ Running with Zero-Config Local File Database (store.json)');
  if (isCloudinaryConfigured()) {
    await store.migrateLocalFilesToCloudinary();
  }
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Question Bank Exchange Server running on port ${PORT}`);
  console.log(`📁 Uploads Directory: ${uploadsPath}`);
});

server.timeout = 600000; // 10 minutes timeout for large file uploads
server.keepAliveTimeout = 60000;
