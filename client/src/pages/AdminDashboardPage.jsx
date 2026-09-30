import React, { useState, useEffect } from 'react';
import {
  getAdminStats,
  getResources,
  getSubjects,
  deleteResource,
  deleteResourcesBulk,
  deleteSubject,
  deleteSubjectsBulk,
  updateResource,
  addSubject,
  resetData,
  getAdminReports,
  updateReportStatus,
  getFileUrl
} from '../services/api';
import PdfViewerModal from '../components/PdfViewerModal';
import { useAuth } from '../context/AuthContext';
import { formatUploadDate } from '../utils/dateUtils';
import {
  LayoutDashboard,
  BookOpen,
  Folder,
  FileText,
  Download,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  Layers,
  LogOut,
  Flag,
  ShieldCheck,
  Upload
} from 'lucide-react';

const ALLOWED_SEMESTERS = ['3-1', '3-2', '4-1', '4-2'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalSemesters: 4, totalSubjects: 15, totalPdfs: 120, totalUploads: 120, totalDownloads: 840, pendingReportsCount: 0 });
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Management Tab: 'resources' | 'subjects' | 'reports'
  const [activeTab, setActiveTab] = useState('resources');
  const [reportFilter, setReportFilter] = useState('All'); // 'All' | 'Pending' | 'Reviewed' | 'Resolved'

  // PDF Management state
  const [searchTable, setSearchTable] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);

  // Subject Management state
  const [searchSubjectQuery, setSearchSubjectQuery] = useState('');
  const [semesterSubjectFilter, setSemesterSubjectFilter] = useState('All');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  // Modals state
  const [editingResource, setEditingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  // Confirmation Delete Modal state for PDF Delete
  const [confirmPdfDeleteModal, setConfirmPdfDeleteModal] = useState({
    isOpen: false,
    type: 'single',
    targetId: null,
    targetName: '',
    count: 0
  });

  // Confirmation Delete Modal state for Subject Delete
  const [confirmSubjectDeleteModal, setConfirmSubjectDeleteModal] = useState({
    isOpen: false,
    type: 'single',
    targetSubject: null,
    resourceCount: 0,
    count: 0
  });

  // New subject form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectSem, setNewSubjectSem] = useState('3-1');

  // Edit resource form
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Toast alert
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  const { logout, showSessionWarning, extendSession } = useAuth();

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 4000);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, resRes, subjRes, repRes] = await Promise.allSettled([
        getAdminStats(),
        getResources(),
        getSubjects(),
        getAdminReports()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) setStats(statsRes.value.data);
      if (resRes.status === 'fulfilled' && resRes.value?.success) setResources(resRes.value.data);
      if (subjRes.status === 'fulfilled' && subjRes.value?.success) setSubjects(subjRes.value.data);
      if (repRes.status === 'fulfilled' && repRes.value?.success) setReports(repRes.value.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      const res = await updateReportStatus(reportId, status);
      if (res.success) {
        showToast(`Report status marked as ${status}`, false);
        loadAdminData();
      }
    } catch (err) {
      showToast('Failed to update report status', true);
    }
  };

  // Filter logic for Resources
  const filteredResources = resources.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTable.toLowerCase()) ||
      r.subjectName.toLowerCase().includes(searchTable.toLowerCase()) ||
      r.semester.toLowerCase().includes(searchTable.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTable.toLowerCase());

    const matchesSem = semesterFilter === 'All' || r.semester === semesterFilter;
    const matchesCat = categoryFilter === 'All' || r.category === categoryFilter;

    return matchesSearch && matchesSem && matchesCat;
  });

  // Filter logic for Subjects
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchSubjectQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchSubjectQuery.toLowerCase())) ||
      s.semester.toLowerCase().includes(searchSubjectQuery.toLowerCase());

    const matchesSem = semesterSubjectFilter === 'All' || s.semester === semesterSubjectFilter;

    return matchesSearch && matchesSem;
  });

  // Checkbox handlers for PDFs
  const handleToggleSelectPdf = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredPdfsSelected =
    filteredResources.length > 0 &&
    filteredResources.every(r => selectedIds.includes(r.id));

  const handleToggleSelectAllPdfs = () => {
    if (isAllFilteredPdfsSelected) {
      const filteredSet = new Set(filteredResources.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...filteredResources.map(r => r.id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  // Checkbox handlers for Subjects
  const handleToggleSelectSubject = (id) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredSubjectsSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every(s => selectedSubjectIds.includes(s.id));

  const handleToggleSelectAllSubjects = () => {
    if (isAllFilteredSubjectsSelected) {
      const filteredSet = new Set(filteredSubjects.map(s => s.id));
      setSelectedSubjectIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const newSelected = new Set([...selectedSubjectIds, ...filteredSubjects.map(s => s.id)]);
      setSelectedSubjectIds(Array.from(newSelected));
    }
  };

  // --- PDF DELETE HANDLERS ---
  const promptSinglePdfDelete = (id, name) => {
    setConfirmPdfDeleteModal({
      isOpen: true,
      type: 'single',
      targetId: id,
      targetName: name,
      count: 1
    });
  };

  const promptBulkPdfDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmPdfDeleteModal({
      isOpen: true,
      type: 'bulk',
      targetId: null,
      targetName: '',
      count: selectedIds.length
    });
  };

  const executePdfDelete = async () => {
    const { type, targetId, targetName, count } = confirmPdfDeleteModal;
    setConfirmPdfDeleteModal(prev => ({ ...prev, isOpen: false }));

    try {
      if (type === 'single' && targetId) {
        const res = await deleteResource(targetId);
        if (res && res.success) {
          showToast('✅ Resource deleted successfully.', false);
          setSelectedIds(prev => prev.filter(id => id !== targetId));
          await loadAdminData();
        } else {
          showToast(`❌ Failed to delete resource: ${res?.message || 'Server error'}`, true);
        }
      } else if (type === 'bulk' && selectedIds.length > 0) {
        const res = await deleteResourcesBulk(selectedIds);
        if (res && res.success) {
          showToast(`✅ ${res.count || count} resource(s) deleted successfully.`, false);
          setSelectedIds([]);
          await loadAdminData();
        } else {
          showToast(`❌ Failed to delete resources: ${res?.message || 'Server error'}`, true);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete resource. Please try again.';
      showToast(`❌ ${msg}`, true);
    }
  };

  // --- SUBJECT DELETE HANDLERS ---
  const promptSingleSubjectDelete = (subject) => {
    setConfirmSubjectDeleteModal({
      isOpen: true,
      type: 'single',
      targetSubject: subject,
      resourceCount: subject.resourceCount || 0,
      count: 1
    });
  };

  const promptBulkSubjectDelete = () => {
    if (selectedSubjectIds.length === 0) return;
    const selectedSubjs = subjects.filter(s => selectedSubjectIds.includes(s.id));
    const totalResourcesCount = selectedSubjs.reduce((acc, s) => acc + (s.resourceCount || 0), 0);

    setConfirmSubjectDeleteModal({
      isOpen: true,
      type: 'bulk',
      targetSubject: null,
      resourceCount: totalResourcesCount,
      count: selectedSubjectIds.length
    });
  };

  const executeSubjectDelete = async () => {
    const { type, targetSubject } = confirmSubjectDeleteModal;
    setConfirmSubjectDeleteModal(prev => ({ ...prev, isOpen: false }));

    try {
      if (type === 'single' && targetSubject) {
        const res = await deleteSubject(targetSubject.id);
        if (res && res.success) {
          showToast(`✅ Subject "${targetSubject.name}" deleted successfully along with associated resources.`, false);
          setSelectedSubjectIds(prev => prev.filter(id => id !== targetSubject.id));
          await loadAdminData();
        } else {
          showToast(`❌ Failed to delete subject: ${res?.message || 'Server error'}`, true);
        }
      } else if (type === 'bulk' && selectedSubjectIds.length > 0) {
        const res = await deleteSubjectsBulk(selectedSubjectIds);
        if (res && res.success) {
          showToast(`✅ ${res.count} subject(s) and ${res.deletedResourcesCount} associated PDF(s) deleted successfully.`, false);
          setSelectedSubjectIds([]);
          await loadAdminData();
        } else {
          showToast(`❌ Failed to delete subjects: ${res?.message || 'Server error'}`, true);
        }
      }
    } catch (err) {
      console.error('Subject Delete error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete subject. Please try again.';
      showToast(`❌ ${msg}`, true);
    }
  };

  // Download action
  const handleDownloadFile = (e, resource) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = getFileUrl(resource.fileUrl);
    link.download = resource.fileName || `${resource.name}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit metadata form
  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setEditName(res.name);
    setEditCategory(res.category);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingResource) return;

    try {
      const res = await updateResource(editingResource.id, {
        name: editName,
        category: editCategory
      });
      if (res.success) {
        showToast('✅ Resource updated successfully', false);
        setEditingResource(null);
        loadAdminData();
      }
    } catch (err) {
      showToast('❌ Failed to update resource', true);
    }
  };

  // Add Subject submit
  const handleAddSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      const res = await addSubject({
        name: newSubjectName.trim(),
        code: newSubjectCode.trim(),
        semester: newSubjectSem
      });
      if (res.success) {
        showToast(`✅ Added Subject "${newSubjectName}"`, false);
        setShowAddSubjectModal(false);
        setNewSubjectName('');
        setNewSubjectCode('');
        loadAdminData();
      }
    } catch (err) {
      showToast('❌ Failed to add subject', true);
    }
  };

  // Reset seed data
  const handleResetData = async () => {
    if (window.confirm('Reset platform data to default seed dataset? Custom uploads will be cleared.')) {
      try {
        const res = await resetData();
        if (res.success) {
          showToast('✅ Platform data reset to seed state', false);
          setSelectedIds([]);
          setSelectedSubjectIds([]);
          loadAdminData();
        }
      } catch (err) {
        showToast('❌ Reset failed', true);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Toast alert */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 ${toast.isError ? 'bg-red-950 border-red-500 text-red-300' : 'bg-slate-900 border-sky-500 text-sky-300'} border px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom`}>
          {toast.isError ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-3 border border-sky-500/20">
            <LayoutDashboard className="w-3.5 h-3.5" /> Platform Admin Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Manage academic subjects, PDFs, and resources across 3-1, 3-2, 4-1, and 4-2 semesters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>

          <button
            onClick={handleResetData}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="Reset platform data to seed state"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" /> Reset Seed Data
          </button>

          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 border border-red-500/30 transition-colors cursor-pointer"
            title="Logout from Admin Session"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Active Semesters</span>
            <span className="text-2xl font-bold text-white">4 <span className="text-xs text-slate-500 font-normal">(3-1 to 4-2)</span></span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Subjects</span>
            <span className="text-2xl font-bold text-white">{stats.totalSubjects}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total PDFs</span>
            <span className="text-2xl font-bold text-sky-400">{stats.totalPdfs}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Downloads</span>
            <span className="text-2xl font-bold text-emerald-400">{stats.totalDownloads}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (PDF Management vs Subject Management vs Reported Resources) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'resources'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Manage PDFs ({resources.length})
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'subjects'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Folder className="w-4 h-4" />
          Manage Subjects ({subjects.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'reports'
              ? 'bg-amber-600 text-slate-950 shadow-lg shadow-amber-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          Reported Resources
          {stats.pendingReportsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
              {stats.pendingReportsCount}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: PDF RESOURCE MANAGEMENT --- */}
      {activeTab === 'resources' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" /> Resource Management
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select specific PDFs to edit or remove them safely from the platform.
              </p>
            </div>

            {/* Bulk Delete PDFs Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={promptBulkPdfDelete}
                disabled={selectedIds.length === 0}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                  selectedIds.length > 0
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-600/20 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                🗑 Delete Selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
            </div>
          </div>

          {/* Filters toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Search by PDF name, subject, semester, or category..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            </div>

            <div className="relative">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 appearance-none"
              >
                <option value="All">All Semesters</option>
                {ALLOWED_SEMESTERS.map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
              <Filter className="w-3 h-3 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 appearance-none"
              >
                <option value="All">All Categories</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Previous Question Paper">Previous Papers</option>
                <option value="Important Questions">Important Questions</option>
                <option value="Study Material">Study Materials</option>
                <option value="Unit-wise Questions">Unit-wise Questions</option>
                <option value="Lab/Practical">Lab/Practical</option>
                <option value="Other">Other</option>
              </select>
              <Filter className="w-3 h-3 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Resources Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 select-none">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredPdfsSelected}
                      onChange={handleToggleSelectAllPdfs}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      title="Select All PDFs"
                    />
                  </th>
                  <th className="px-4 py-3.5">PDF Name</th>
                  <th className="px-4 py-3.5">Semester</th>
                  <th className="px-4 py-3.5">Subject</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">File Size</th>
                  <th className="px-4 py-3.5">Upload Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500 text-xs">
                      No PDF resources found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResources.map((res) => {
                    const isSelected = selectedIds.includes(res.id);
                    return (
                      <tr
                        key={res.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-sky-500/10 hover:bg-sky-500/15' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectPdf(res.id)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-white max-w-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="truncate" title={res.name}>{res.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-sky-400 whitespace-nowrap">
                          {res.semester}
                        </td>
                        <td className="px-4 py-3.5 max-w-[140px] truncate text-slate-300" title={res.subjectName}>
                          {res.subjectName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium">
                            {res.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {res.fileSize || '1.0 MB'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                          {res.uploadedDate}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingResource(res)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors flex items-center gap-1 text-[11px] font-semibold border border-slate-700/60"
                              title="View PDF"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={(e) => handleDownloadFile(e, res)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors flex items-center gap-1 text-[11px] font-semibold border border-slate-700/60"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button
                              onClick={() => promptSinglePdfDelete(res.id, res.name)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold border border-red-500/20"
                              title="Delete Resource"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- TAB 2: SUBJECT MANAGEMENT --- */}
      {activeTab === 'subjects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-400" /> Subject Management
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select subjects to remove them along with all their associated resources and PDF files.
              </p>
            </div>

            {/* Bulk Delete Subjects Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={promptBulkSubjectDelete}
                disabled={selectedSubjectIds.length === 0}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                  selectedSubjectIds.length > 0
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-600/20 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                🗑 Delete Selected {selectedSubjectIds.length > 0 ? `(${selectedSubjectIds.length})` : ''}
              </button>
            </div>
          </div>

          {/* Filters toolbar for Subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <input
                type="text"
                placeholder="Search subjects by name, code, or semester..."
                value={searchSubjectQuery}
                onChange={(e) => setSearchSubjectQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            </div>

            <div className="relative">
              <select
                value={semesterSubjectFilter}
                onChange={(e) => setSemesterSubjectFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 appearance-none"
              >
                <option value="All">All Semesters</option>
                {ALLOWED_SEMESTERS.map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
              <Filter className="w-3 h-3 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Subjects Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 select-none">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSubjectsSelected}
                      onChange={handleToggleSelectAllSubjects}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      title="Select All Subjects"
                    />
                  </th>
                  <th className="px-4 py-3.5">Subject Name</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Semester</th>
                  <th className="px-4 py-3.5 text-center">PDFs / Resources</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-xs">
                      No subjects found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subj) => {
                    const isSelected = selectedSubjectIds.includes(subj.id);
                    return (
                      <tr
                        key={subj.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSubject(subj.id)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white max-w-xs truncate">
                          {subj.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                          {subj.code || 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-sky-400 whitespace-nowrap">
                          {subj.semester}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold">
                            {subj.resourceCount || 0} PDFs
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => promptSingleSubjectDelete(subj)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-semibold border border-red-500/20 ml-auto"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Confirmation Modal for PDF Delete */}
      {confirmPdfDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {confirmPdfDeleteModal.type === 'bulk'
                    ? `Delete ${confirmPdfDeleteModal.count} selected resources?`
                    : 'Delete selected resource?'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This action will permanently remove {confirmPdfDeleteModal.type === 'bulk' ? `these ${confirmPdfDeleteModal.count} PDF(s)` : `"${confirmPdfDeleteModal.targetName}"`} from the website and file storage.
                </p>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-300 font-medium">
              ⚠️ Warning: This action cannot be undone.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPdfDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePdfDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Subject Delete */}
      {confirmSubjectDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {confirmSubjectDeleteModal.type === 'bulk'
                    ? `Delete ${confirmSubjectDeleteModal.count} Selected Subjects?`
                    : `Delete Subject "${confirmSubjectDeleteModal.targetSubject?.name}"?`}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmSubjectDeleteModal.type === 'single' ? (
                    confirmSubjectDeleteModal.resourceCount > 0 ? (
                      <>
                        <strong className="text-white">{confirmSubjectDeleteModal.targetSubject?.name}</strong> contains <strong className="text-amber-400">{confirmSubjectDeleteModal.resourceCount} resource(s)</strong>. Deleting this subject will also permanently remove all {confirmSubjectDeleteModal.resourceCount} associated resources and stored PDF files.
                      </>
                    ) : (
                      <>Are you sure you want to delete this subject?</>
                    )
                  ) : (
                    <>
                      You are about to delete <strong className="text-white">{confirmSubjectDeleteModal.count} subjects</strong> and all <strong className="text-amber-400">{confirmSubjectDeleteModal.resourceCount} associated resources</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-[11px] text-red-300 font-medium">
              🚨 Cascade Delete Warning: All associated PDFs, search results, and disk files will be permanently deleted.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubjectDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSubjectDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: REPORTED RESOURCES MANAGEMENT --- */}
      {activeTab === 'reports' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                Reported Resources Management
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Review and resolve user-submitted broken PDF reports. Inspect files before choosing to keep, resolve, or delete.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
              {['All', 'Pending', 'Reviewed', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setReportFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    reportFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Table / List */}
          {reports.filter(r => reportFilter === 'All' || r.status === reportFilter).length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto" />
              <h3 className="text-sm font-bold text-white">No reported resources found</h3>
              <p className="text-xs text-slate-400">All submitted broken PDF reports have been handled!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports
                .filter(r => reportFilter === 'All' || r.status === reportFilter)
                .map((report) => {
                  const targetRes = resources.find(res => res.id === report.resourceId);
                  return (
                    <div
                      key={report.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              report.status === 'Pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : report.status === 'Reviewed'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              ● Status: {report.status}
                            </span>
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                              Reason: {report.reason}
                            </span>
                            <span className="text-xs text-slate-500">
                              • {formatUploadDate(report.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white leading-tight">
                            {report.resourceName}
                          </h3>

                          <div className="text-xs text-slate-400">
                            Semester: <strong className="text-slate-200">{report.semester}</strong> • Subject: <strong className="text-slate-200">{report.subjectName || 'N/A'}</strong>
                          </div>
                        </div>

                        {/* Status Action Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'Reviewed')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                              report.status === 'Reviewed'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            Mark Reviewed
                          </button>

                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'Resolved')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                              report.status === 'Resolved'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>

                      {/* User Message Details */}
                      {report.userMessage && (
                        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
                          <strong className="text-slate-400 block mb-0.5">User Details:</strong>
                          “{report.userMessage}”
                        </div>
                      )}

                      {/* Action Triggers: View / Delete PDF */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {targetRes ? (
                          <>
                            <button
                              onClick={() => setViewingResource(targetRes)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" /> View PDF
                            </button>

                            <button
                              onClick={() => promptSinglePdfDelete(targetRes.id, targetRes.name)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 border border-red-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Resource
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Resource was already deleted</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* Admin Session Expiration Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Admin Session Expiry Warning</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your admin session is about to expire due to inactivity. Would you like to stay logged in?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={logout}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
              >
                Logout Now
              </button>
              <button
                onClick={extendSession}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add New Subject</h3>
              <button onClick={() => setShowAddSubjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Computing"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. CC308"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Semester *</label>
                <select
                  value={newSubjectSem}
                  onChange={(e) => setNewSubjectSem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                >
                  {ALLOWED_SEMESTERS.map(s => (
                    <option key={s} value={s}>{s} Semester</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold shadow-md"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit Resource Metadata</h3>
              <button onClick={() => setEditingResource(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Resource Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500 text-xs"
                >
                  {['Question Banks', 'Previous Question Papers', 'Important Questions', 'Unit-wise Questions', 'Study Materials', 'Lab / Practical', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingResource && (
        <PdfViewerModal
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
        />
      )}

    </div>
  );
}
