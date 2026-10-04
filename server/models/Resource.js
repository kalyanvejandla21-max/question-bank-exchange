import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  semester: { type: String, required: true },
  subjectId: { type: String, required: true },
  subjectName: { type: String },
  category: { type: String, required: true },
  fileName: { type: String },
  fileUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        if (!v) return false;
        if (v.startsWith('/uploads/')) return false;
        return true;
      },
      message: props => `Invalid resource URL '${props.value}': Local /uploads/ paths are not allowed.`
    }
  },
  fileSize: { type: String },
  fileHash: { type: String },
  cloudinaryPublicId: { type: String, default: null },
  r2Key: { type: String, default: null },
  storageProvider: { type: String, enum: ['cloudinary', 'r2'], default: 'cloudinary' },
  uploadedDate: { type: String, default: () => new Date().toISOString() },
  uploadedBy: { type: String, default: 'Student/User' },
  downloadsCount: { type: Number, default: 0 },
  reportStatus: { type: String, default: 'none' }
}, {
  strict: false,
  timestamps: true
});

export const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema, 'resources');
