import React, { useState } from 'react';
import { FileText, Eye, Download, Calendar, HardDrive, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { recordDownload, getFileUrl } from '../services/api';
import { formatUploadDate } from '../utils/dateUtils';
import ReportModal from './ReportModal';

export default function ResourceCard({ resource, onView, onDownloadSuccess }) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Question Bank':
      case 'Question Banks':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Previous Question Paper':
      case 'Previous Question Papers':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Important Questions':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Unit-wise Questions':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Study Material':
      case 'Study Materials':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'Lab / Practical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      await recordDownload(resource.id);
      if (onDownloadSuccess) onDownloadSuccess(resource.id);

      const link = document.createElement('a');
      link.href = getFileUrl(resource.fileUrl);
      link.download = resource.fileName || `${resource.name}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      window.open(getFileUrl(resource.fileUrl), '_blank');
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        className="bg-[#0d111a]/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        {/* Left: PDF Icon + Resource Details */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(resource.category)}`}>
                {resource.category}
              </span>

              {resource.semester && (
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-sky-400 border border-slate-800">
                  Sem {resource.semester}
                </span>
              )}

              <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {formatUploadDate(resource.uploadedDate)}
              </span>
            </div>

            <h4 
              className="text-sm sm:text-base font-bold text-white leading-snug truncate hover:text-sky-400 transition-colors cursor-pointer" 
              onClick={() => onView && onView(resource)}
            >
              {resource.name}
            </h4>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                {resource.fileSize || 'PDF'}
              </span>

              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Download className="w-3.5 h-3.5 text-teal-400" />
                {resource.downloadsCount || 0} downloads
              </span>

              {resource.subjectName && (
                <span className="text-slate-400 truncate max-w-[200px]">
                  • {resource.subjectName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            onClick={() => setReportModalOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-400 hover:text-amber-400 text-xs border border-slate-800 transition-colors"
            title="Report PDF Issue"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>

          <button
            onClick={() => onView && onView(resource)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            View
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </motion.div>

      <ReportModal
        resource={resource}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
