import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSemesters, getSubjects, uploadResource, addSubject } from '../services/api';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, X, FolderPlus, Copy, ShieldAlert } from 'lucide-react';
import FileUpload from '../components/FileUpload';

const SEMESTERS = ['3-1', '3-2', '4-1', '4-2'];

const CATEGORIES = [
  'Question Banks',
  'Previous Question Papers',
  'Important Questions',
  'Unit-wise Questions',
  'Study Materials',
  'Lab / Practical',
  'Other'
];

export default function UploadPage() {
  const navigate = useNavigate();

  const [semester, setSemester] = useState('3-1');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [category, setCategory] = useState('Question Banks');
  const [resourceName, setResourceName] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  // Upload States: 'Selecting' | 'Uploading' | 'Processing' | 'Completed' | 'Failed'
  const [uploadState, setUploadState] = useState('Selecting');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Fetch subjects whenever selected semester changes
  useEffect(() => {
    async function loadSemesterSubjects() {
      try {
        const res = await getSubjects(semester);
        if (res.success) {
          setSubjects(res.data);
          if (res.data.length > 0) {
            setSelectedSubjectId(res.data[0].id);
            setIsCustomSubject(false);
          } else {
            setIsCustomSubject(true);
          }
        }
      } catch (err) {
        console.error('Error fetching subjects for upload:', err);
      }
    }
    loadSemesterSubjects();
  }, [semester]);

  const handleFileSelect = (file) => {
    setErrorMessage('');
    setDuplicateData(null);
    if (file) {
      setPdfFile(file);
      if (!resourceName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setResourceName(cleanName);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setDuplicateData(null);

    if (!resourceName.trim()) {
      setErrorMessage('Please enter a Resource Title.');
      return;
    }

    if (!pdfFile) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    let finalSubjectId = selectedSubjectId;

    setUploadState('Uploading');
    setUploadProgress(10);

    try {
      if (isCustomSubject || !finalSubjectId) {
        if (!customSubjectName.trim()) {
          setErrorMessage('Please enter a Subject Name.');
          setUploadState('Selecting');
          return;
        }
        const subjRes = await addSubject({
          name: customSubjectName.trim(),
          semester
        });
        if (subjRes.success) {
          finalSubjectId = subjRes.data.id;
        }
      }

      const formData = new FormData();
      formData.append('name', resourceName.trim());
      formData.append('semester', semester);
      formData.append('subjectId', finalSubjectId);
      formData.append('category', category);
      formData.append('pdfFile', pdfFile);

      const response = await uploadResource(formData, (percent) => {
        setUploadProgress(percent);
        if (percent >= 90) {
          setUploadState('Processing');
        }
      });

      if (response.success) {
        setUploadState('Completed');
        setSuccessData(response.data);
      } else {
        setUploadState('Failed');
        setErrorMessage(response.message || 'Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadState('Failed');
      const data = err.response?.data;
      if (data?.isDuplicate) {
        setDuplicateData(data);
        setErrorMessage(data.message || 'This PDF already exists.');
      } else {
        setErrorMessage(data?.message || err.message || 'Upload failed. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-3 border border-sky-500/20">
            <Upload className="w-3.5 h-3.5" /> Academic Resource Upload
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Upload Question Bank PDF</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Upload unit question banks, previous exam papers, or lecture notes. PDF format only (Max size: 25 MB).
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0">
          <FileText className="w-8 h-8" />
        </div>
      </div>

      {/* Upload Success View */}
      {successData ? (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 text-center animate-in zoom-in-95 duration-200 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-2 uppercase tracking-wider">
            Uploaded Successfully ✓
          </span>

          <h2 className="text-2xl font-bold text-white mb-2">Resource Upload Completed</h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
            Your PDF <strong className="text-sky-400">"{successData.name}"</strong> is now live under <span className="text-amber-400 font-semibold">{successData.semester}</span> semester.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={`/subjects/${successData.subjectId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
            >
              View Subject Resources
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                setSuccessData(null);
                setResourceName('');
                setPdfFile(null);
                setUploadProgress(0);
                setUploadState('Selecting');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors border border-slate-700"
            >
              Upload Another PDF
            </button>
          </div>
        </div>
      ) : (
        /* Upload Form */
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
          
          {/* Duplicate PDF Warning Card */}
          {duplicateData && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-5 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">This PDF already exists</h4>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    An identical PDF or resource with the same title already exists in the system database.
                  </p>
                  {duplicateData.existingResource && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/20 text-xs space-y-1 mt-2">
                      <span className="font-bold text-white block">{duplicateData.existingResource.name}</span>
                      <span className="text-slate-400 text-[11px]">Semester: {duplicateData.existingResource.semester} • Category: {duplicateData.existingResource.category}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateData(null);
                    setErrorMessage('');
                    setPdfFile(null);
                    setUploadState('Selecting');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          )}

          {/* Standard Error Message */}
          {errorMessage && !duplicateData && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Semester Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Semester *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {SEMESTERS.map(sem => (
                  <option key={sem} value={sem}>{sem} Semester</option>
                ))}
              </select>
            </div>

            {/* Subject Dropdown / Custom Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Subject *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSubject(!isCustomSubject)}
                  className="text-[11px] text-sky-400 hover:underline font-medium"
                >
                  {isCustomSubject ? 'Select Existing Subject' : '+ Add New Subject'}
                </button>
              </div>

              {isCustomSubject ? (
                <input
                  type="text"
                  placeholder="Enter custom subject name e.g. DWDM"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {subjects.map(subj => (
                    <option key={subj.id} value={subj.id}>{subj.name} ({subj.code || 'N/A'})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Resource Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Resource Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Resource Title *
              </label>
              <input
                type="text"
                placeholder="e.g. DWDM Unit 3 Important Questions 2026"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

          </div>

          {/* PDF File Picker */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              PDF Document * <span className="text-slate-500 lowercase">(Only PDF files allowed, max 25 MB)</span>
            </label>

            <FileUpload
              file={pdfFile}
              onFileSelect={handleFileSelect}
              onRemove={() => {
                setPdfFile(null);
                setErrorMessage('');
                setDuplicateData(null);
              }}
              uploadState={uploadState}
              uploadProgress={uploadProgress}
              errorMessage={errorMessage}
              onError={(err) => {
                setErrorMessage(err);
                setPdfFile(null);
              }}
            />
          </div>

        </form>
      )}

    </div>
  );
}

