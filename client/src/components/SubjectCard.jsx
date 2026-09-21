import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, FileText, ChevronRight } from 'lucide-react';

export default function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-1 flex items-center justify-between"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
          <Folder className="w-6 h-6" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            {subject.code && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 uppercase tracking-wider">
                {subject.code}
              </span>
            )}
            <span className="text-xs text-slate-400">Semester {subject.semester}</span>
          </div>

          <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
            {subject.name}
          </h4>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span><strong className="text-slate-200">{subject.resourceCount || 0}</strong> PDF Resources available</span>
          </p>
        </div>
      </div>

      <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-sky-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0 ml-4">
        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
