import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getFileUrl = (fileUrl) => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  const serverUrl = API_BASE.replace(/\/api\/?$/, '');
  return `${serverUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
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

export const getSemesters = async () => {
  const res = await api.get('/semesters');
  return res.data;
};

export const getSubjects = async (semester) => {
  const res = await api.get('/subjects', { params: { semester } });
  return res.data;
};

export const getSubjectById = async (id) => {
  const res = await api.get(`/subjects/${id}`);
  return res.data;
};

export const addSubject = async (subjectData) => {
  const res = await api.post('/subjects', subjectData);
  return res.data;
};

export const deleteSubject = async (id) => {
  const res = await api.delete(`/subjects/${id}`);
  return res.data;
};

export const deleteSubjectsBulk = async (ids = []) => {
  const res = await api.post('/subjects/bulk-delete', { ids });
  return res.data;
};

export const addSemester = async (semesterData) => {
  const res = await api.post('/semesters', semesterData);
  return res.data;
};

export const getResources = async (params = {}) => {
  const res = await api.get('/resources', { params });
  return res.data;
};

export const getResourceById = async (id) => {
  const res = await api.get(`/resources/${id}`);
  return res.data;
};

export const uploadResource = async (formData, onProgress) => {
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

export const updateResource = async (id, data) => {
  const res = await api.put(`/resources/${id}`, data);
  return res.data;
};

export const deleteResource = async (id) => {
  const res = await api.delete(`/resources/${id}`);
  return res.data;
};

export const deleteResourcesBulk = async (ids = []) => {
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
  const res = await api.post('/admin/reset');
  return res.data;
};

export default api;
