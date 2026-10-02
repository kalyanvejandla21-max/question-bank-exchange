import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, CheckCircle2, AlertCircle, RotateCcw, ArrowUp, FileCheck } from 'lucide-react';

/**
 * Kokonut UI File Upload Illustration (100x100 SVG)
 * - 100x100 SVG
 * - rotating dashed circular border
 * - animated folder/container path
 * - animated upload arrow with continuous upward float
 * - floating particle elements
 */
function UploadIllustration({ isDragging, isDragInvalid }) {
  return (
    <div className="relative w-[100px] h-[100px] flex items-center justify-center pointer-events-none select-none">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="kokonut-sky-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          <linearGradient id="kokonut-error-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          <filter id="kokonut-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Glow Disk */}
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill={isDragInvalid ? "url(#kokonut-error-grad)" : "url(#kokonut-sky-grad)"}
          opacity={isDragging ? 0.25 : 0.08}
          animate={{
            scale: isDragging ? [1, 1.12, 1] : [1, 1.05, 1],
            opacity: isDragging ? [0.25, 0.4, 0.25] : [0.08, 0.15, 0.08]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer Rotating Dashed Circle (Kokonut Signature) */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          stroke={isDragInvalid ? "#ef4444" : "url(#kokonut-sky-grad)"}
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity={isDragging ? 0.9 : 0.4}
          animate={{ rotate: isDragging ? 360 : 360 }}
          transition={{
            duration: isDragging ? 8 : 20,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Inner Counter-Rotating Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="36"
          stroke={isDragInvalid ? "#f87171" : "#38bdf8"}
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity={0.3}
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Center Folder / Document Container Path */}
        <g filter="url(#kokonut-glow)">
          {/* Base Folder Outline */}
          <path
            d="M32 38C32 35.7909 33.7909 34 36 34H44L48 38H64C66.2091 38 68 39.7909 68 42V64C68 66.2091 66.2091 68 64 68H36C33.7909 68 32 66.2091 32 64V38Z"
            fill="#0f172a"
            stroke={isDragInvalid ? "#ef4444" : "#0284c7"}
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Inner Paper Insert */}
          <motion.path
            d="M37 44H63V62C63 63.1046 62.1046 64 61 64H39C37.8954 64 37 63.1046 37 62V44Z"
            fill="#1e293b"
            stroke={isDragInvalid ? "#f87171" : "#38bdf8"}
            strokeWidth="1"
            opacity="0.8"
            animate={{ y: isDragging ? [-1, -3, -1] : [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Animated Floating Upload Arrow */}
          <motion.g
            animate={{ y: [2, -4, 2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Arrow Stem */}
            <path
              d="M50 59V43"
              stroke={isDragInvalid ? "#ef4444" : "#38bdf8"}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Arrow Head */}
            <path
              d="M44 48L50 42L56 48"
              stroke={isDragInvalid ? "#ef4444" : "#38bdf8"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
        </g>

        {/* Floating Sparkle / Particle Dots */}
        <motion.circle
          cx="30"
          cy="30"
          r="1.5"
          fill="#38bdf8"
          animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.circle
          cx="70"
          cy="32"
          r="2"
          fill="#818cf8"
          animate={{ opacity: [0.3, 0.9, 0.3], y: [0, -5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.6 }}
        />
        <motion.circle
          cx="68"
          cy="68"
          r="1.5"
          fill="#38bdf8"
          animate={{ opacity: [0.1, 0.7, 0.1], y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
        />
      </svg>
    </div>
  );
}

/**
 * Kokonut UI Uploading Animation (Multi-Ring SVG)
 * - circular multi-ring SVG
 * - multiple rotating rings
 * - progress circle representation
 */
function UploadingAnimation({ progress = 0 }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-[100px] h-[100px] flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="kokonut-upload-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* Track Ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#1e293b"
          strokeWidth="4"
          fill="none"
        />

        {/* Progress Arc Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#kokonut-upload-grad)"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transformOrigin: "50px 50px", transform: "rotate(-90deg)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />

        {/* Outer Rotating Dashed Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          opacity="0.6"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Inner Counter-Rotating Orbit Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="30"
          stroke="#818cf8"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.5"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />
      </svg>

      {/* Center PDF Upload Icon & Percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Upload className="w-5 h-5 text-sky-400 animate-pulse mb-0.5" />
        <span className="text-[11px] font-extrabold text-white font-mono leading-none">
          {progress > 0 ? `${progress}%` : '...'}
        </span>
      </div>
    </div>
  );
}

/**
 * Reusable Kokonut UI File Upload Component
 */
export default function FileUpload({
  file,
  onFileSelect,
  onRemove,
  uploadState = 'Selecting',
  uploadProgress = 0,
  errorMessage = '',
  onError = () => {}
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return { valid: false, error: 'No file selected.' };

    const isPdfMime = selectedFile.type === 'application/pdf';
    const isPdfExt = selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdfMime && !isPdfExt) {
      return { valid: false, error: 'Only PDF files are allowed.' };
    }

    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB
    if (selectedFile.size > maxSizeBytes) {
      return { valid: false, error: 'File size exceeds 25 MB.' };
    }

    return { valid: true, error: null };
  };

  const processFile = (candidateFile) => {
    const { valid, error } = validateFile(candidateFile);
    if (!valid) {
      onError(error);
      return;
    }
    onFileSelect(candidateFile);
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
        const isPdf = item.type === 'application/pdf' || item.type === '';
        setIsDragInvalid(!isPdf);
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
      setIsDragInvalid(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDragInvalid(false);
    dragCounter.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  };

  const triggerFileInput = () => {
    if (uploadState === 'Uploading' || uploadState === 'Processing') return;
    fileInputRef.current?.click();
  };

  const isUploading = uploadState === 'Uploading' || uploadState === 'Processing';

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
        id="kokonut-pdf-upload-input"
        aria-label="Upload PDF Document"
      />

      {/* Kokonut Outer Container (ring/border + padding) */}
      <div className="w-full max-w-2xl mx-auto rounded-2xl p-1 bg-gradient-to-b from-slate-800/80 via-slate-800/40 to-slate-900/90 border border-slate-800/90 shadow-2xl relative overflow-hidden group">
        
        <AnimatePresence mode="wait">
          {!file ? (
            /* IDLE / DROPZONE PANEL (Exact Kokonut 240px Layout) */
            <motion.div
              key="kokonut-idle-dropzone"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={triggerFileInput}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                relative w-full h-[240px] rounded-[12px] bg-slate-950/90 border flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 overflow-hidden
                ${isDragInvalid 
                  ? 'border-red-500/80 bg-red-500/10 shadow-lg shadow-red-500/20' 
                  : isDragging 
                    ? 'border-sky-400 bg-sky-500/10 shadow-2xl shadow-sky-500/20 scale-[1.01]' 
                    : 'border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-900/60'
                }
              `}
            >
              {/* Blue Glow Overlays when dragging */}
              {isDragging && !isDragInvalid && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-indigo-500/10 to-sky-400/20 pointer-events-none"
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center space-y-2.5">
                
                {/* 100x100 Kokonut Animated Illustration */}
                <UploadIllustration isDragging={isDragging} isDragInvalid={isDragInvalid} />

                {/* Typography & Actions */}
                {isDragInvalid ? (
                  <div className="space-y-1 animate-bounce">
                    <p className="text-sm font-bold text-red-400">
                      Only PDF files are allowed.
                    </p>
                    <p className="text-xs text-red-300/80">
                      Please drop a valid .pdf file.
                    </p>
                  </div>
                ) : isDragging ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-sky-300">
                      Drop your PDF file here
                    </p>
                    <p className="text-xs text-sky-400/80">
                      Release to choose file
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Drag and drop or
                      </h3>
                      <p className="text-xs text-slate-400">
                        PDF up to 25 MB
                      </p>
                    </div>

                    {/* Upload File Button */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all mt-1"
                    >
                      Upload PDF
                      <Upload className="w-3.5 h-3.5" />
                    </motion.button>

                    <p className="text-[11px] text-slate-500 pt-0.5">
                      or drag and drop your PDF here
                    </p>
                  </>
                )}

              </div>
            </motion.div>
          ) : (
            /* SELECTED FILE & REAL UPLOADING STATE PANEL */
            <motion.div
              key="kokonut-file-selected"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="relative w-full min-h-[240px] rounded-[12px] bg-slate-950/95 border border-sky-500/30 flex flex-col items-center justify-center p-6 text-center overflow-hidden"
            >
              {/* Background ambient radial glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full flex flex-col items-center space-y-4">
                
                {/* Illustration / Uploading Animation */}
                {isUploading ? (
                  <UploadingAnimation progress={uploadProgress} />
                ) : (
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-sky-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg">
                    <FileText className="w-8 h-8" />
                    <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold px-1 rounded uppercase tracking-tighter">
                      PDF
                    </span>
                  </div>
                )}

                {/* File Metadata */}
                <div className="space-y-1 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate max-w-xs">
                      {file.name}
                    </h4>
                    {!isUploading && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                        <FileCheck className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Uploading Status message */}
                {isUploading && (
                  <p className="text-xs font-medium text-sky-400 animate-pulse">
                    {uploadState === 'Processing'
                      ? 'Processing & verifying duplicate hash...'
                      : 'Uploading to server...'}
                  </p>
                )}

                {/* Action Buttons in Selected State */}
                {!isUploading && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Upload PDF Resource
                    </button>
                    <button
                      type="button"
                      onClick={onRemove}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-semibold transition-all duration-200"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
