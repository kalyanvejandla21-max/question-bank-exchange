import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  resourceId: { type: String, required: true },
  resourceName: { type: String },
  semester: { type: String },
  subjectName: { type: String },
  reason: { type: String },
  userMessage: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, default: 'Pending' }
}, {
  strict: false,
  timestamps: true
});

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema, 'reports');
