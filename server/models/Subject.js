import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  semester: { type: String, required: true }
}, {
  strict: false,
  timestamps: true
});

export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema, 'subjects');
