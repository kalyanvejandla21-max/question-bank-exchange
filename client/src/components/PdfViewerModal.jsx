import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, Download, FileText, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { downloadResourceFile, getFileUrl } from '../services/api';
import ReportModal from './ReportModal';

export default function PdfViewerModal({ resource, onClose, onDownloadSuccess }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!resource) return null;

  const fullPdfUrl = `${getFileUrl(resource.fileUrl)}#page=${currentPage}&zoom=${zoom}`;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadResourceFile(resource, onDownloadSuccess);
    } catch (e) {
      console.error('Download error:', e);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleFullscreen = () => {
    const modalElement = document.getElementById('pdf-modal-container');
    if (!document.fullscreenElement) {
      modalElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="pdf-modal-container"
        className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header Toolbar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Title & Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">{resource.name}</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {resource.semester} • {resource.category} • {resource.fileSize}
              </p>
            </div>
          </div>

          {/* PDF View Controls */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-slate-300">
            {/* Page Navigation */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors text-xs flex items-center"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-sky-400">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-10 text-center text-slate-400">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            {/* Rotation & Fullscreen */}
            <button
              onClick={handleRotate}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Download & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 border border-slate-800 transition-colors text-xs flex items-center gap-1"
              title="Report Broken PDF"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Report</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* PDF Document View Area */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
          <iframe
            src={fullPdfUrl}
            title={resource.name}
            style={{ transform: `rotate(${rotation}deg)` }}
            className="w-full h-full rounded-lg border-0 transition-transform duration-300 shadow-2xl bg-white"
          />
        </div>

      </div>

      <ReportModal
        resource={resource}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
