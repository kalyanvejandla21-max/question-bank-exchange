import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Upload, FolderOpen } from 'lucide-react';

export default function EmptyState({
  title = "No resources available yet.",
  subtitle = "Be the first student to upload a question bank.",
  actionLabel = "Upload Resource",
  actionLink = "/upload"
}) {
  return (
    <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center my-8">
      <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5 shadow-inner">
        <FolderOpen className="w-10 h-10" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {subtitle}
      </p>

      {actionLink && (
        <Link
          to={actionLink}
          className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-600/20 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
