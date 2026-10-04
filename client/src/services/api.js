import axios from 'axios';

const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL;
  if (!url) {
    url = import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://question-bank-exchange.onrender.com/api';
  }
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE = getApiBaseUrl();

export const getFileUrl = (fileUrl) => {
  if (!fileUrl) return '';

  // Extract Cloudinary URL if prepended with any local host prefix
  if (fileUrl.includes('res.cloudinary.com')) {
    const match = fileUrl.match(/(https:\/\/res\.cloudinary\.com\/[^\s"']+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Handle full HTTP/HTTPS URLs
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    if (fileUrl.includes('localhost:5000') || fileUrl.includes('127.0.0.1:5000')) {
      const serverUrl = API_BASE.replace(/\/api\/?$/, '');
      const relativePath = fileUrl.replace(/^https?:\/\/[^\/]+/, '');
      return `${serverUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
    }
    return fileUrl;
  }

  // Handle relative paths (e.g., /uploads/...)
  const serverUrl = API_BASE.replace(/\/api\/?$/, '');
  return `${serverUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
};

export const getDownloadUrl = (fileUrl) => {
  const url = getFileUrl(fileUrl);
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/fl_attachment/')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
  }
  return url;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30s timeout for normal API calls
});

// Interceptor to attach Authorization Bearer token automatically if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qbank_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// In-Memory Catalog Cache for fast page navigation
const catalogCache = new Map();
const CACHE_TTL_MS = 120000; // 2 minutes cache for public catalog data

const getCachedData = (key) => {
  const item = catalogCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    catalogCache.delete(key);
    return null;
  }
  return item.data;
};

const setCachedData = (key, data) => {
  catalogCache.set(key, { data, timestamp: Date.now() });
};

export const clearCatalogCache = () => {
  catalogCache.clear();
};

// Admin Auth Services
export const adminLogin = async (credentials) => {
  const res = await api.post('/admin/login', credentials);
  if (res.data && res.data.success && res.data.token) {
    localStorage.setItem('qbank_admin_token', res.data.token);
  }
  return res.data;
};

export const adminLogout = () => {
  localStorage.removeItem('qbank_admin_token');
};

export const isAdminAuthenticated = () => {
  return !!localStorage.getItem('qbank_admin_token');
};

export const getSemesters = async (options = {}) => {
  const cacheKey = 'semesters';
  if (!options.bypassCache) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }
  const res = await api.get('/semesters');
  if (res.data && res.data.success) {
    setCachedData(cacheKey, res.data);
  }
  return res.data;
};

export const getSubjects = async (semester, options = {}) => {
  const cacheKey = `subjects_${semester || 'all'}`;
  if (!options.bypassCache) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }
  const res = await api.get('/subjects', { params: { semester } });
  if (res.data && res.data.success) {
    setCachedData(cacheKey, res.data);
  }
  return res.data;
};

export const getSubjectById = async (id) => {
  const res = await api.get(`/subjects/${id}`);
  return res.data;
};

export const addSubject = async (subjectData) => {
  clearCatalogCache();
  const res = await api.post('/subjects', subjectData);
  return res.data;
};

export const deleteSubject = async (id) => {
  clearCatalogCache();
  const res = await api.delete(`/subjects/${id}`);
  return res.data;
};

export const deleteSubjectsBulk = async (ids = []) => {
  clearCatalogCache();
  const res = await api.post('/subjects/bulk-delete', { ids });
  return res.data;
};

export const addSemester = async (semesterData) => {
  clearCatalogCache();
  const res = await api.post('/semesters', semesterData);
  return res.data;
};

export const getResources = async (params = {}, options = {}) => {
  const cacheKey = `resources_${JSON.stringify(params || {})}`;
  if (!options.bypassCache) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }
  const res = await api.get('/resources', { params });
  if (res.data && res.data.success) {
    setCachedData(cacheKey, res.data);
  }
  return res.data;
};

export const getResourceById = async (id) => {
  const res = await api.get(`/resources/${id}`);
  return res.data;
};

export const uploadResource = async (formData, onProgress) => {
  clearCatalogCache();
  const res = await api.post('/resources/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 600000,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  });
  return res.data;
};

export const recordDownload = async (id) => {
  const res = await api.post(`/resources/${id}/download`);
  return res.data;
};

export const downloadResourceFile = async (resource, onDownloadSuccess) => {
  if (!resource) throw new Error('No resource provided');

  try {
    await recordDownload(resource.id);
    if (onDownloadSuccess) onDownloadSuccess(resource.id);
  } catch (err) {
    console.warn('Download counter update warning:', err.message);
  }

  const fileName = resource.fileName || `${resource.name || 'document'}.pdf`;
  const downloadUrl = getDownloadUrl(resource.fileUrl);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);

    return { success: true };
  } catch (err) {
    console.error('Blob download failed, trying direct attachment fallback:', err);
    try {
      const fallbackUrl = downloadUrl || `${API_BASE}/resources/${resource.id}/download-file`;
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 500);
      return { success: true };
    } catch (fallbackErr) {
      console.error('Download fallback failed:', fallbackErr);
      throw new Error('Download failed. Please try again.');
    }
  }
};

export const updateResource = async (id, data) => {
  clearCatalogCache();
  const res = await api.put(`/resources/${id}`, data);
  return res.data;
};

export const deleteResource = async (id) => {
  clearCatalogCache();
  const res = await api.delete(`/resources/${id}`);
  return res.data;
};

export const deleteResourcesBulk = async (ids = []) => {
  clearCatalogCache();
  const res = await api.post('/resources/bulk-delete', { ids });
  return res.data;
};

export const reportResource = async (id, { reason, message }) => {
  const res = await api.post(`/resources/${id}/report`, { reason, message });
  return res.data;
};

export const getAdminReports = async () => {
  const res = await api.get('/resources/reports/all');
  return res.data;
};

export const updateReportStatus = async (reportId, status) => {
  const res = await api.put(`/resources/reports/${reportId}`, { status });
  return res.data;
};

export const searchGlobal = async (query) => {
  const res = await api.get('/search', { params: { q: query } });
  return res.data;
};

export const getAdminStats = async () => {
  const res = await api.get('/admin/stats');
  return res.data;
};

export const resetData = async () => {
  clearCatalogCache();
  const res = await api.post('/admin/reset');
  return res.data;
};

export default api;
