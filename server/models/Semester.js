import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  title: { type: String },
  description: { type: String }
}, {
  strict: false,
  timestamps: true
});

export const Semester = mongoose.models.Semester || mongoose.model('Semester', semesterSchema, 'semesters');
