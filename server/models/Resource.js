import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  semester: { type: String, required: true },
  subjectId: { type: String, required: true },
  subjectName: { type: String },
  category: { type: String, required: true },
  fileName: { type: String },
  fileUrl: { type: String, required: true },
  fileSize: { type: String },
  fileHash: { type: String },
  cloudinaryPublicId: { type: String, default: null },
  uploadedDate: { type: String, default: () => new Date().toISOString() },
  uploadedBy: { type: String, default: 'Student/User' },
  downloadsCount: { type: Number, default: 0 },
  reportStatus: { type: String, default: 'none' }
}, {
  strict: false,
  timestamps: true
});

export const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema, 'resources');
