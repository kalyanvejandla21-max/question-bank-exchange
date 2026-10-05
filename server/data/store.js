import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { initialSemesters, initialSubjects, initialResources } from './seedData.js';
import { ensureSamplePdfs } from './seedPdfs.js';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { deleteFromGridFS } from '../config/gridfs.js';
import { Resource, Subject, Semester, Report } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const STORE_FILE = path.join(__dirname, 'store.json');
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

    const activeDbPath = fs.existsSync(STORE_FILE) ? STORE_FILE : (fs.existsSync(DB_FILE) ? DB_FILE : null);

    if (activeDbPath) {
      try {
        const raw = fs.readFileSync(activeDbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          semesters: Array.isArray(parsed.semesters) ? parsed.semesters.filter(s => ALLOWED_SEMESTERS.includes(s.name)) : [],
          subjects: Array.isArray(parsed.subjects) ? parsed.subjects.filter(s => ALLOWED_SEMESTERS.includes(s.semester)) : [],
          resources: Array.isArray(parsed.resources) ? parsed.resources.filter(r => ALLOWED_SEMESTERS.includes(r.semester)) : [],
          reports: Array.isArray(parsed.reports) ? parsed.reports : []
        };
        
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
        console.error('Error reading database file, re-initializing with seed data:', err);
        this.resetToSeed();
      }
    } else {
      this.resetToSeed();
    }
  }

  async syncWithMongo() {
    if (mongoose.connection.readyState !== 1) return;

    try {
      const mongoSemesters = await Semester.find({});
      const mongoSubjects = await Subject.find({});
      const mongoResources = await Resource.find({});
      const mongoReports = await Report.find({});

      // If MongoDB is completely empty, populate seed data into MongoDB
      if (mongoSemesters.length === 0 && mongoSubjects.length === 0 && mongoResources.length === 0) {
        console.log('🌱 Populating MongoDB with initial seed data...');
        for (const sem of this.data.semesters) {
          await Semester.updateOne({ id: sem.id }, { $set: sem }, { upsert: true });
        }
        for (const subj of this.data.subjects) {
          await Subject.updateOne({ id: subj.id }, { $set: subj }, { upsert: true });
        }
        for (const res of this.data.resources) {
          await Resource.updateOne({ id: res.id }, { $set: res }, { upsert: true });
        }
      } else {
        // Load data from MongoDB into in-memory store
        this.data.semesters = mongoSemesters.map(s => {
          const obj = typeof s.toObject === 'function' ? s.toObject() : s;
          if (!obj.id && obj._id) obj.id = obj._id.toString();
          return obj;
        });
        this.data.subjects = mongoSubjects.map(s => {
          const obj = typeof s.toObject === 'function' ? s.toObject() : s;
          if (!obj.id && obj._id) obj.id = obj._id.toString();
          return obj;
        });
        this.data.resources = mongoResources.map(r => {
          const obj = typeof r.toObject === 'function' ? r.toObject() : r;
          if (!obj.id && obj._id) obj.id = obj._id.toString();
          return obj;
        });
        this.data.reports = mongoReports.map(rep => {
          const obj = typeof rep.toObject === 'function' ? rep.toObject() : rep;
          if (!obj.id && obj._id) obj.id = obj._id.toString();
          return obj;
        });
      }
    } catch (err) {
      console.error('Error syncing store with MongoDB:', err.message);
    }
  }

  resetToSeed() {
    this.data = {
      semesters: [...initialSemesters],
      subjects: [...initialSubjects],
      resources: [...initialResources],
      reports: []
    };
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
      const jsonStr = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(STORE_FILE, jsonStr, 'utf-8');
      fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
    } catch (err) {
      console.error('Failed to save store.json / db.json:', err);
    }
  }

  async migrateLocalFilesToCloudinary() {
    if (!isCloudinaryConfigured()) {
      console.log('⚠️ [Migration] Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.');
      console.log('ℹ️ [Migration] Local PDFs will remain in store.json until Cloudinary environment variables are set.');
      return { migratedCount: 0, skippedCount: 0, failedCount: 0 };
    }

    const toMigrate = [];
    let skippedCount = 0;

    for (const res of this.data.resources) {
      if (res.fileUrl && res.fileUrl.includes('res.cloudinary.com')) {
        const match = res.fileUrl.match(/(https:\/\/res\.cloudinary\.com\/[^\s"']+)/);
        if (match && match[1] && res.fileUrl !== match[1]) {
          res.fileUrl = match[1];
        }
        skippedCount++;
        continue;
      }

      if (res.fileUrl && res.fileUrl.startsWith('https://res.cloudinary.com/') && res.cloudinaryPublicId) {
        skippedCount++;
        continue;
      }

      toMigrate.push(res);
    }

    console.log(`[Migration] Found ${toMigrate.length} resources requiring migration`);

    let migratedCount = 0;
    let failedCount = 0;
    let updated = false;

    for (const res of toMigrate) {
      const fileName = res.fileName || (res.fileUrl ? path.basename(res.fileUrl) : null);
      if (!fileName) {
        console.warn(`[Migration] Missing fileName for resource "${res.name}" (${res.id}). Skipping.`);
        failedCount++;
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`[Migration] Physical PDF missing for "${res.name}" (${fileName}) at ${filePath}. Preserving resource record.`);
        failedCount++;
        continue;
      }

      try {
        console.log(`[Migration] Uploading ${fileName}`);
        const cldRes = await uploadToCloudinary(filePath, fileName);
        console.log(`[Migration] Uploaded successfully`);

        res.fileUrl = cldRes.secure_url;
        res.cloudinaryPublicId = cldRes.public_id;
        res.fileName = fileName;
        updated = true;

        console.log(`[Migration] Updated resource ${res.id}`);
        migratedCount++;
      } catch (err) {
        console.error(`[Migration] Upload failed for "${res.name}" (${fileName}): ${err.message}`);
        failedCount++;
      }
    }

    if (updated) {
      this.save();
      console.log('[Migration] Database files (store.json & db.json) successfully updated on disk.');
    }

    console.log(`[Migration] Completed: ${migratedCount} migrated, ${skippedCount} skipped, ${failedCount} failed`);
    return { migratedCount, skippedCount, failedCount };
  }

  // Semesters
  getSemesters() {
    return this.data.semesters.filter(s => ALLOWED_SEMESTERS.includes(s.name));
  }

  async addSemester({ name, title, description }) {
    if (!ALLOWED_SEMESTERS.includes(name)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }
    const id = `sem-${Date.now()}`;
    const newSem = { id, name, title: title || `Semester ${name}`, description: description || '' };
    this.data.semesters.push(newSem);
    this.save();

    if (mongoose.connection.readyState === 1) {
      await Semester.create(newSem);
    }

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

  async addSubject({ name, code, semester }) {
    if (!ALLOWED_SEMESTERS.includes(semester)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }
    const id = `subj-${Date.now()}`;
    const newSubj = { id, name, code: code || name.slice(0, 4).toUpperCase(), semester };
    this.data.subjects.push(newSubj);
    this.save();

    if (mongoose.connection.readyState === 1) {
      await Subject.create(newSubj);
    }

    return newSubj;
  }

  async deleteSubject(id) {
    const stringId = String(id);
    console.log(`[DataStore.deleteSubject] Target ID: "${stringId}"`);

    const index = this.data.subjects.findIndex(s => s.id === stringId || (s._id && s._id.toString() === stringId));
    const removedSubject = index !== -1 ? this.data.subjects[index] : null;

    const relatedResources = this.data.resources.filter(r => r.subjectId === stringId);
    const removedResIds = new Set(relatedResources.map(r => r.id || (r._id ? r._id.toString() : null)).filter(Boolean));

    if (mongoose.connection.readyState === 1) {
      const isHex24 = /^[0-9a-fA-F]{24}$/.test(stringId);
      const orConditions = [{ id: stringId }];
      if (isHex24) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(stringId) });
      }
      if (removedSubject && removedSubject._id && /^[0-9a-fA-F]{24}$/.test(removedSubject._id.toString())) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(removedSubject._id.toString()) });
      }

      console.log(`[MongoDB Delete Subject] Querying Subject.deleteOne with $or:`, orConditions);
      const subjDeleteRes = await Subject.deleteOne({ $or: orConditions });
      console.log(`[MongoDB Delete Subject] Result: deletedCount=${subjDeleteRes.deletedCount}`);

      const resDeleteRes = await Resource.deleteMany({ subjectId: stringId });
      console.log(`[MongoDB Delete Subject] Deleted Associated Resources Count: ${resDeleteRes.deletedCount}`);

      if (removedResIds.size > 0) {
        const resIdList = Array.from(removedResIds);
        await Report.deleteMany({ resourceId: { $in: resIdList } });
      }
    }

    if (index !== -1) {
      this.data.subjects.splice(index, 1);
    }
    this.data.resources = this.data.resources.filter(r => r.subjectId !== stringId);
    this.data.reports = this.data.reports.filter(rep => !removedResIds.has(rep.resourceId));
    this.save();

    relatedResources.forEach(async r => {
      if (r.storageProvider === 'gridfs' || r.gridfsId) {
        const gId = r.gridfsId || (r.fileUrl ? r.fileUrl.split('/file/')[1] : null);
        if (gId) {
          try { await deleteFromGridFS(gId); } catch (e) {}
        }
      } else if (r.cloudinaryPublicId) {
        try { await deleteFromCloudinary(r.cloudinaryPublicId); } catch (e) {}
      } else if (r.fileName) {
        this.cleanupFileOnDisk(r.fileName);
      }
    });

    return {
      subject: removedSubject || { id: stringId },
      deletedResourcesCount: relatedResources.length,
      deletedResources: relatedResources
    };
  }

  async deleteSubjectsBatch(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return { count: 0, deletedResourcesCount: 0, deletedResources: [] };
    const stringIds = ids.map(id => String(id));
    console.log(`[DataStore.deleteSubjectsBatch] Target Subject IDs (${stringIds.length}):`, stringIds);

    const idSet = new Set(stringIds);

    const removedSubjects = [];
    this.data.subjects.forEach(s => {
      const sId = s.id || (s._id ? s._id.toString() : null);
      if (sId && (idSet.has(sId) || (s._id && idSet.has(s._id.toString())))) {
        removedSubjects.push(s);
      }
    });

    const removedResources = [];
    this.data.resources.forEach(r => {
      if (idSet.has(String(r.subjectId))) {
        removedResources.push(r);
      }
    });

    const removedResIds = new Set(removedResources.map(r => r.id || (r._id ? r._id.toString() : null)).filter(Boolean));

    if (mongoose.connection.readyState === 1) {
      const orConditions = [{ id: { $in: stringIds } }];

      const objectIds = [];
      stringIds.forEach(id => {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          objectIds.push(new mongoose.Types.ObjectId(id));
        }
      });
      removedSubjects.forEach(s => {
        if (s._id && /^[0-9a-fA-F]{24}$/.test(s._id.toString())) {
          objectIds.push(new mongoose.Types.ObjectId(s._id.toString()));
        }
      });

      if (objectIds.length > 0) {
        orConditions.push({ _id: { $in: objectIds } });
      }

      console.log(`[MongoDB Batch Delete Subjects] Querying Subject.deleteMany with $or:`, orConditions);
      const subjDeleteRes = await Subject.deleteMany({ $or: orConditions });
      console.log(`[MongoDB Batch Delete Subjects] Result: deletedCount=${subjDeleteRes.deletedCount}`);

      const resDeleteRes = await Resource.deleteMany({ subjectId: { $in: stringIds } });
      console.log(`[MongoDB Batch Delete Subjects] Deleted Associated Resources Count: ${resDeleteRes.deletedCount}`);

      if (removedResIds.size > 0) {
        await Report.deleteMany({ resourceId: { $in: Array.from(removedResIds) } });
      }
    }

    this.data.subjects = this.data.subjects.filter(s => {
      const sId = s.id || (s._id ? s._id.toString() : null);
      if (sId && (idSet.has(sId) || (s._id && idSet.has(s._id.toString())))) {
        return false;
      }
      return true;
    });

    this.data.resources = this.data.resources.filter(r => !idSet.has(String(r.subjectId)));
    this.data.reports = this.data.reports.filter(rep => !removedResIds.has(rep.resourceId));
    this.save();

    removedResources.forEach(async r => {
      if (r.storageProvider === 'gridfs' || r.gridfsId) {
        const gId = r.gridfsId || (r.fileUrl ? r.fileUrl.split('/file/')[1] : null);
        if (gId) {
          try { await deleteFromGridFS(gId); } catch (e) {}
        }
      } else if (r.cloudinaryPublicId) {
        try { await deleteFromCloudinary(r.cloudinaryPublicId); } catch (e) {}
      } else if (r.fileName) {
        this.cleanupFileOnDisk(r.fileName);
      }
    });

    return {
      count: removedSubjects.length,
      deletedResourcesCount: removedResources.length,
      deletedResources: removedResources
    };
  }

  sanitizeResource(res) {
    if (!res) return null;
    const copy = typeof res.toObject === 'function' ? res.toObject() : { ...res };
    
    if (!copy.id && copy._id) {
      copy.id = copy._id.toString();
    }

    if (copy.fileUrl) {
      if (copy.fileUrl.includes('res.cloudinary.com')) {
        const match = copy.fileUrl.match(/(https:\/\/res\.cloudinary\.com\/[^\s"']+)/);
        if (match && match[1]) {
          copy.fileUrl = match[1];
        }
      } else if (copy.fileUrl.includes('localhost:')) {
        copy.fileUrl = copy.fileUrl.replace(/^https?:\/\/localhost:\d+/, '');
      }
    }

    return copy;
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
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.semester && r.semester.toLowerCase().includes(q))
      );
    }

    return list
      .map(r => this.sanitizeResource(r))
      .sort((a, b) => new Date(b.uploadedDate || b.createdAt || 0) - new Date(a.uploadedDate || a.createdAt || 0));
  }

  getResourceById(id) {
    const res = this.data.resources.find(r => r.id === id || r._id === id || (r._id && r._id.toString() === id));
    return this.sanitizeResource(res);
  }

  checkDuplicateResource({ fileHash, name, semester }) {
    if (fileHash) {
      const existingByHash = this.data.resources.find(r => r.fileHash === fileHash);
      if (existingByHash) return existingByHash;
    }
    if (name && semester) {
      const existingByNameSem = this.data.resources.find(r => 
        r.semester === semester && (r.name || r.title || '').trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (existingByNameSem) return existingByNameSem;
    }
    return null;
  }

  async addResource({ name, semester, subjectId, category, fileName, fileUrl, fileSize, filePath, cloudinaryPublicId, r2Key, gridfsId, storageProvider }) {
    if (!ALLOWED_SEMESTERS.includes(semester)) {
      throw new Error(`Invalid semester. Allowed semesters are: ${ALLOWED_SEMESTERS.join(', ')}`);
    }

    if (!fileUrl) {
      throw new Error('Resource fileUrl is required.');
    }

    const fileHash = filePath ? calculateFileHash(filePath) : null;

    const duplicate = this.checkDuplicateResource({ fileHash, name, semester });
    if (duplicate) {
      const err = new Error(`This PDF already exists: "${duplicate.name || duplicate.title}" (${duplicate.semester})`);
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
      r2Key: r2Key || null,
      gridfsId: gridfsId || null,
      storageProvider: storageProvider || (gridfsId ? 'gridfs' : (fileUrl.includes('res.cloudinary.com') ? 'cloudinary' : 'gridfs')),
      uploadedDate: new Date().toISOString(),
      uploadedBy: 'Student/User',
      downloadsCount: 0,
      reportStatus: 'none'
    };

    this.data.resources.push(newResource);
    this.save();

    if (mongoose.connection.readyState === 1) {
      await Resource.create(newResource);
    }

    return newResource;
  }

  updateResource(id, updateFields) {
    const res = this.data.resources.find(r => r.id === id || r._id === id || (r._id && r._id.toString() === id));
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

    if (mongoose.connection.readyState === 1) {
      const stringId = String(id);
      const isHex24 = /^[0-9a-fA-F]{24}$/.test(stringId);
      const orConditions = [{ id: stringId }];
      if (isHex24) orConditions.push({ _id: new mongoose.Types.ObjectId(stringId) });
      Resource.updateOne({ $or: orConditions }, { $set: updateFields }).catch(err => console.error('MongoDB Resource update error:', err.message));
    }

    return this.sanitizeResource(res);
  }

  incrementDownload(id) {
    const res = this.data.resources.find(r => r.id === id || r._id === id || (r._id && r._id.toString() === id));
    if (res) {
      res.downloadsCount = (res.downloadsCount || 0) + 1;
      this.save();

      if (mongoose.connection.readyState === 1) {
        const stringId = String(id);
        const isHex24 = /^[0-9a-fA-F]{24}$/.test(stringId);
        const orConditions = [{ id: stringId }];
        if (isHex24) orConditions.push({ _id: new mongoose.Types.ObjectId(stringId) });
        Resource.updateOne({ $or: orConditions }, { $inc: { downloadsCount: 1 } }).catch(err => console.error('MongoDB Resource download inc error:', err.message));
      }
    }
    return this.sanitizeResource(res);
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

  async deleteResource(id) {
    const stringId = String(id);
    console.log(`[DataStore.deleteResource] Target ID: "${stringId}"`);

    const index = this.data.resources.findIndex(r => 
      r.id === stringId || 
      (r._id && r._id.toString() === stringId)
    );

    let removed = index !== -1 ? this.data.resources[index] : null;

    if (mongoose.connection.readyState === 1) {
      const isHex24 = /^[0-9a-fA-F]{24}$/.test(stringId);
      const orConditions = [{ id: stringId }];
      if (isHex24) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(stringId) });
      }
      if (removed && removed._id && removed._id.toString() !== stringId && /^[0-9a-fA-F]{24}$/.test(removed._id.toString())) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(removed._id.toString()) });
      }

      console.log(`[MongoDB Resource Delete] Querying deleteOne with $or:`, orConditions);
      const mongoResult = await Resource.deleteOne({ $or: orConditions });
      console.log(`[MongoDB Resource Delete] Result: deletedCount=${mongoResult.deletedCount}`);

      const repConditions = [{ resourceId: stringId }];
      if (removed && removed.id && removed.id !== stringId) {
        repConditions.push({ resourceId: String(removed.id) });
      }
      await Report.deleteMany({ $or: repConditions });

      if (mongoResult.deletedCount === 0 && !removed) {
        return null;
      }
    }

    if (index !== -1) {
      this.data.resources.splice(index, 1);
      this.data.reports = this.data.reports.filter(rep => rep.resourceId !== stringId && (removed ? rep.resourceId !== removed.id : true));
      this.save();
    }

    if (removed && removed.fileName) {
      this.cleanupFileOnDisk(removed.fileName);
    }

    return removed || { id: stringId };
  }

  async deleteResourcesBatch(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    
    const stringIds = ids.map(id => String(id));
    console.log(`[DataStore.deleteResourcesBatch] Target Resource IDs (${stringIds.length}):`, stringIds);

    const idSet = new Set(stringIds);

    const removedList = [];
    this.data.resources.forEach(r => {
      const rId = r.id || (r._id ? r._id.toString() : null);
      if (rId && (idSet.has(rId) || (r._id && idSet.has(r._id.toString())))) {
        removedList.push(r);
      }
    });

    if (mongoose.connection.readyState === 1) {
      const orConditions = [{ id: { $in: stringIds } }];

      const objectIds = [];
      stringIds.forEach(id => {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          objectIds.push(new mongoose.Types.ObjectId(id));
        }
      });
      removedList.forEach(r => {
        if (r._id && /^[0-9a-fA-F]{24}$/.test(r._id.toString())) {
          objectIds.push(new mongoose.Types.ObjectId(r._id.toString()));
        }
      });

      if (objectIds.length > 0) {
        orConditions.push({ _id: { $in: objectIds } });
      }

      console.log(`[MongoDB Batch Resource Delete] Querying deleteMany with $or:`, orConditions);
      const mongoResult = await Resource.deleteMany({ $or: orConditions });
      console.log(`[MongoDB Batch Resource Delete] Result: deletedCount=${mongoResult.deletedCount}`);

      const repOrConditions = [{ resourceId: { $in: stringIds } }];
      if (objectIds.length > 0) {
        repOrConditions.push({ resourceId: { $in: objectIds } });
      }
      await Report.deleteMany({ $or: repOrConditions });
    }

    // Remove from in-memory array
    this.data.resources = this.data.resources.filter(r => {
      const rId = r.id || (r._id ? r._id.toString() : null);
      if (rId && (idSet.has(rId) || (r._id && idSet.has(r._id.toString())))) {
        return false;
      }
      return true;
    });

    this.data.reports = this.data.reports.filter(rep => !idSet.has(String(rep.resourceId)));
    this.save();

    removedList.forEach(r => {
      if (r.fileName) {
        this.cleanupFileOnDisk(r.fileName);
      }
    });

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
      resourceName: resource.name || resource.title,
      semester: resource.semester,
      subjectName: resource.subjectName,
      reason: reason || 'Other',
      userMessage: userMessage || '',
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };

    if (!Array.isArray(this.data.reports)) {
      this.data.reports = [];
    }

    this.data.reports.unshift(newReport);
    resource.reportStatus = 'pending';
    this.save();

    if (mongoose.connection.readyState === 1) {
      Report.create(newReport).catch(err => console.error('MongoDB Report create error:', err.message));
      Resource.updateOne({ $or: [{ id: resourceId }, { _id: resourceId }] }, { $set: { reportStatus: 'pending' } }).catch(err => console.error('MongoDB Resource reportStatus update error:', err.message));
    }

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

    report.status = status;

    const resource = this.getResourceById(report.resourceId);
    if (resource) {
      resource.reportStatus = status.toLowerCase();
    }

    this.save();

    if (mongoose.connection.readyState === 1) {
      Report.updateOne({ id: reportId }, { $set: { status } }).catch(err => console.error('MongoDB Report status update error:', err.message));
      if (report.resourceId) {
        Resource.updateOne({ $or: [{ id: report.resourceId }, { _id: report.resourceId }] }, { $set: { reportStatus: status.toLowerCase() } }).catch(err => console.error('MongoDB Resource reportStatus update error:', err.message));
      }
    }

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
