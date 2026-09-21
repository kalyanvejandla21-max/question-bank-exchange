import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText } from 'lucide-react';

export default function SemesterCard({ semester }) {
  return (
    <Link
      to={`/semesters/${semester.name}`}
      className="group relative bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1.5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-extrabold text-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300 shadow-inner">
            {semester.name}
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-sky-400" />
            {semester.subjectCount || 0} Subjects
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-sky-400 transition-colors">
          {semester.title || `Semester ${semester.name}`}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {semester.description || 'Access question banks, previous question papers, and study material PDFs.'}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <strong className="text-slate-200 font-semibold">{semester.resourceCount || 0}</strong> PDFs Available
        </span>
        <span className="text-sky-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Browse <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
