import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initialSemesters, initialSubjects, initialResources } from './seedData.js';
import { ensureSamplePdfs } from './seedPdfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ALLOWED_SEMESTERS = ['3-1', '3-2', '4-1', '4-2'];

function calculateFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  } catch (err) {
    console.error('Error calculating file hash:', err);
    return null;
  }
}

class DataStore {
  constructor() {
    this.data = {
      semesters: [],
      subjects: [],
      resources: [],
      reports: []
    };
    this.init();
  }

  init() {
    // Ensure uploads directory exists and has sample PDFs
    ensureSamplePdfs(UPLOADS_DIR);

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          semesters: Array.isArray(parsed.semesters) ? parsed.semesters.filter(s => ALLOWED_SEMESTERS.includes(s.name)) : [],
          subjects: Array.isArray(parsed.subjects) ? parsed.subjects.filter(s => ALLOWED_SEMESTERS.includes(s.semester)) : [],
          resources: Array.isArray(parsed.resources) ? parsed.resources.filter(r => ALLOWED_SEMESTERS.includes(r.semester)) : [],
          reports: Array.isArray(parsed.reports) ? parsed.reports : []
        };
        
        // Populate hashes for existing resources if missing
        let updated = false;
        this.data.resources.forEach(res => {
          if (!res.fileHash && res.fileName) {
            const filePath = path.join(UPLOADS_DIR, res.fileName);
            const hash = calculateFileHash(filePath);
            if (hash) {
              res.fileHash = hash;
              updated = true;
            }
          }
          if (!res.reportStatus) {
            res.reportStatus = 'none';
          }
        });
        if (updated) this.save();
      } catch (err) {
        console.error('Error reading db.json, re-initializing with seed data:', err);
        this.resetToSeed();
      }
    } else {
      this.resetToSeed();
    }
  }

  resetToSeed() {
    this.data = {
      semesters: [...initialSemesters],
      subjects: [...initialSubjects],
      resources: [...initialResources],
      reports: []
    };
    // Populate hashes for seed resources
    this.data.resources.forEach(res => {
      if (res.fileName) {
        const filePath = path.join(UPLOADS_DIR, res.fileName);
        res.fileHash = calculateFileHash(filePath);
      }
      res.reportStatus = 'none';
    });
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save to db.json:', err);
    }
  }

  // Semesters
  getSemesters() {
    return this.data.semesters.filter(s => ALLOWED_SEMESTERS.includes(s.name));
  }

  addSemester({ name, title, description }) {
    if (!ALLOWED_SEMESTERS.includes(name)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }
    const id = `sem-${Date.now()}`;
    const newSem = { id, name, title: title || `Semester ${name}`, description: description || '' };
    this.data.semesters.push(newSem);
    this.save();
    return newSem;
  }

  // Subjects
  getSubjects(semesterName) {
    let list = this.data.subjects.filter(s => ALLOWED_SEMESTERS.includes(s.semester));
    if (semesterName && semesterName !== 'All') {
      list = list.filter(s => s.semester === semesterName);
    }
    return list;
  }

  getSubjectById(id) {
    return this.data.subjects.find(s => s.id === id);
  }

  addSubject({ name, code, semester }) {
    if (!ALLOWED_SEMESTERS.includes(semester)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }
    const id = `subj-${Date.now()}`;
    const newSubj = { id, name, code: code || name.slice(0, 4).toUpperCase(), semester };
    this.data.subjects.push(newSubj);
    this.save();
    return newSubj;
  }

  deleteSubject(id) {
    const index = this.data.subjects.findIndex(s => s.id === id);
    if (index === -1) return null;

    const removedSubject = this.data.subjects.splice(index, 1)[0];

    // Cascade delete all resources belonging to this subject
    const relatedResources = this.data.resources.filter(r => r.subjectId === id);
    this.data.resources = this.data.resources.filter(r => r.subjectId !== id);

    // Remove reports associated with deleted resources
    const removedResIds = new Set(relatedResources.map(r => r.id));
    this.data.reports = this.data.reports.filter(rep => !removedResIds.has(rep.resourceId));

    this.save();

    // Clean up physical PDF files on disk for removed resources
    relatedResources.forEach(r => {
      if (r.fileName) {
        this.cleanupFileOnDisk(r.fileName);
      }
    });

    return {
      subject: removedSubject,
      deletedResourcesCount: relatedResources.length,
      deletedResources: relatedResources
    };
  }

  deleteSubjectsBatch(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return { count: 0, deletedResourcesCount: 0, deletedResources: [] };
    const idSet = new Set(ids);

    const removedSubjects = [];
    this.data.subjects = this.data.subjects.filter(s => {
      if (idSet.has(s.id)) {
        removedSubjects.push(s);
        return false;
      }
      return true;
    });

    const removedResources = [];
    this.data.resources = this.data.resources.filter(r => {
      if (idSet.has(r.subjectId)) {
        removedResources.push(r);
        return false;
      }
      return true;
    });

    const removedResIds = new Set(removedResources.map(r => r.id));
    this.data.reports = this.data.reports.filter(rep => !removedResIds.has(rep.resourceId));

    if (removedSubjects.length > 0) {
      this.save();
      removedResources.forEach(r => {
        if (r.fileName) {
          this.cleanupFileOnDisk(r.fileName);
        }
      });
    }

    return {
      count: removedSubjects.length,
      deletedResourcesCount: removedResources.length,
      deletedResources: removedResources
    };
  }

  // Resources
  getResources({ subjectId, semester, category, search }) {
    let list = this.data.resources.filter(r => ALLOWED_SEMESTERS.includes(r.semester));

    if (subjectId && subjectId !== 'All') {
      list = list.filter(r => r.subjectId === subjectId);
    }

    if (semester && semester !== 'All') {
      list = list.filter(r => r.semester === semester);
    }

    if (category && category !== 'All') {
      list = list.filter(r => r.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.name.toLowerCase().includes(q) ||
        (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.semester && r.semester.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));
  }

  getResourceById(id) {
    return this.data.resources.find(r => r.id === id);
  }

  checkDuplicateResource({ fileHash, name, semester }) {
    if (fileHash) {
      const existingByHash = this.data.resources.find(r => r.fileHash === fileHash);
      if (existingByHash) return existingByHash;
    }
    if (name && semester) {
      const existingByNameSem = this.data.resources.find(r => 
        r.semester === semester && r.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (existingByNameSem) return existingByNameSem;
    }
    return null;
  }

  addResource({ name, semester, subjectId, category, fileName, fileUrl, fileSize, filePath, cloudinaryPublicId }) {
    if (!ALLOWED_SEMESTERS.includes(semester)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }

    const fileHash = filePath ? calculateFileHash(filePath) : null;

    // Check duplicate
    const duplicate = this.checkDuplicateResource({ fileHash, name, semester });
    if (duplicate) {
      const err = new Error(`This PDF already exists: "${duplicate.name}" (${duplicate.semester})`);
      err.isDuplicate = true;
      err.existingResource = duplicate;
      throw err;
    }

    const id = `res-${Date.now()}`;
    const subject = this.getSubjectById(subjectId);
    const subjectName = subject ? subject.name : 'General Subject';

    const newResource = {
      id,
      name: name.trim(),
      semester,
      subjectId,
      subjectName,
      category,
      fileName,
      fileUrl,
      fileSize: fileSize || '1.0 MB',
      fileHash,
      cloudinaryPublicId: cloudinaryPublicId || null,
      uploadedDate: new Date().toISOString(),
      uploadedBy: 'Student/User',
      downloadsCount: 0,
      reportStatus: 'none'
    };

    this.data.resources.push(newResource);
    this.save();
    return newResource;
  }

  updateResource(id, updateFields) {
    const res = this.getResourceById(id);
    if (!res) return null;

    Object.assign(res, updateFields);
    if (updateFields.subjectId) {
      const subj = this.getSubjectById(updateFields.subjectId);
      if (subj) {
        res.subjectName = subj.name;
        res.semester = subj.semester;
      }
    }

    this.save();
    return res;
  }

  incrementDownload(id) {
    const res = this.getResourceById(id);
    if (res) {
      res.downloadsCount = (res.downloadsCount || 0) + 1;
      this.save();
    }
    return res;
  }

  cleanupFileOnDisk(fileName) {
    if (!fileName) return;
    const stillUsed = this.data.resources.some(r => r.fileName === fileName);
    if (!stillUsed) {
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removed physical file from disk: ${fileName}`);
        } catch (err) {
          console.error(`Failed to delete physical file ${fileName}:`, err.message);
        }
      }
    }
  }

  deleteResource(id) {
    const index = this.data.resources.findIndex(r => r.id === id);
    if (index !== -1) {
      const removed = this.data.resources.splice(index, 1)[0];
      // Clean reports for this resource
      this.data.reports = this.data.reports.filter(rep => rep.resourceId !== id);
      this.save();
      if (removed && removed.fileName) {
        this.cleanupFileOnDisk(removed.fileName);
      }
      return removed;
    }
    return null;
  }

  deleteResourcesBatch(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const idSet = new Set(ids);
    const removedList = [];

    this.data.resources = this.data.resources.filter(r => {
      if (idSet.has(r.id)) {
        removedList.push(r);
        return false;
      }
      return true;
    });

    this.data.reports = this.data.reports.filter(rep => !idSet.has(rep.resourceId));

    if (removedList.length > 0) {
      this.save();
      removedList.forEach(r => {
        if (r.fileName) {
          this.cleanupFileOnDisk(r.fileName);
        }
      });
    }

    return removedList;
  }

  // Broken PDF Reports
  addReport({ resourceId, reason, userMessage }) {
    const resource = this.getResourceById(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    const reportId = `rep-${Date.now()}`;
    const newReport = {
      id: reportId,
      resourceId,
      resourceName: resource.name,
      semester: resource.semester,
      subjectName: resource.subjectName,
      reason: reason || 'Other',
      userMessage: userMessage || '',
      createdAt: new Date().toISOString(),
      status: 'Pending' // 'Pending' | 'Reviewed' | 'Resolved'
    };

    if (!Array.isArray(this.data.reports)) {
      this.data.reports = [];
    }

    this.data.reports.unshift(newReport);
    resource.reportStatus = 'pending';
    this.save();

    return newReport;
  }

  getReports() {
    if (!Array.isArray(this.data.reports)) {
      this.data.reports = [];
    }
    return this.data.reports;
  }

  updateReportStatus(reportId, status) {
    if (!Array.isArray(this.data.reports)) return null;
    const report = this.data.reports.find(rep => rep.id === reportId);
    if (!report) return null;

    report.status = status; // 'Reviewed' | 'Resolved' | 'Pending'

    const resource = this.getResourceById(report.resourceId);
    if (resource) {
      resource.reportStatus = status.toLowerCase();
    }

    this.save();
    return report;
  }

  getStats() {
    const validResources = this.data.resources.filter(r => ALLOWED_SEMESTERS.includes(r.semester));
    const validSubjects = this.data.subjects.filter(s => ALLOWED_SEMESTERS.includes(s.semester));
    const validSemesters = this.data.semesters.filter(s => ALLOWED_SEMESTERS.includes(s.name));

    const totalSemesters = validSemesters.length;
    const totalSubjects = validSubjects.length;
    const totalPdfs = validResources.length;
    const totalUploads = validResources.length;
    const totalDownloads = validResources.reduce((acc, r) => acc + (r.downloadsCount || 0), 0);
    const pendingReportsCount = (this.data.reports || []).filter(rep => rep.status === 'Pending').length;

    // Semester PDF distribution breakdown
    const pdfsBySemester = {};
    ALLOWED_SEMESTERS.forEach(sem => {
      pdfsBySemester[sem] = validResources.filter(r => r.semester === sem).length;
    });

    return {
      totalSemesters,
      totalSubjects,
      totalPdfs,
      totalUploads,
      totalDownloads,
      pendingReportsCount,
      pdfsBySemester
    };
  }
}

export const store = new DataStore();

