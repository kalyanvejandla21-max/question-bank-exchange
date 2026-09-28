import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SemesterCard({ semester }) {
  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        to={`/semesters/${encodeURIComponent(semester.name)}`}
        className="group relative h-full bg-[#0d111a]/80 hover:bg-[#111726] border border-slate-800/90 hover:border-sky-500/40 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-sky-500/10 flex flex-col justify-between overflow-hidden"
      >
        {/* Subtle accent glow behind card */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all duration-500 pointer-events-none" />

        <div>
          {/* Header Badge & Semester Code */}
          <div className="flex items-center justify-between mb-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-teal-500/10 border border-sky-500/30 text-sky-400 font-extrabold text-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 shadow-md">
              {semester.name}
            </div>
            
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5 shadow-inner">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>{semester.subjectCount ?? 0} Subjects</span>
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-sky-300 transition-colors">
            {semester.title || `Semester ${semester.name}`}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-6">
            {semester.description || 'Access question banks, previous question papers, and study material PDFs.'}
          </p>
        </div>

        {/* Footer Metrics & Browse CTA */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-slate-200 font-bold">{semester.resourceCount ?? 0}</strong>
            <span className="text-slate-400">PDFs</span>
          </span>

          <span className="text-sky-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Browse <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
