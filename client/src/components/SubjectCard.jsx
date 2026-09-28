import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubjectCard({ subject }) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link
        to={`/subjects/${subject.id}`}
        className="group bg-[#0d111a]/80 hover:bg-[#111726] border border-slate-800/90 hover:border-sky-500/40 rounded-2xl p-5 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-sky-500/10 flex items-center justify-between"
      >
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Folder className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {subject.code && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800 uppercase tracking-wider">
                  {subject.code}
                </span>
              )}
              <span className="text-xs text-slate-400">Semester {subject.semester}</span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors truncate">
              {subject.name}
            </h4>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span><strong className="text-slate-200 font-semibold">{subject.resourceCount ?? 0}</strong> PDFs Available</span>
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 group-hover:bg-sky-500 group-hover:border-sky-400 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0 ml-4 shadow-sm">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}
