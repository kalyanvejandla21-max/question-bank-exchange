import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, Upload, LayoutDashboard, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-[#05070a] text-slate-400 py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Concept */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg shadow-sky-500/5">
                <img 
                  src="/logo.png" 
                  alt="QB Exchanger Logo" 
                  className="w-full h-full object-contain rounded-lg" 
                />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                QB <span className="bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">EXCHANGER</span>
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              A modern, centralized academic resource exchange for college students. Easily discover, preview, and download unit-wise question banks, previous semester exam papers, and study material PDFs.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-sky-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              Find • Learn • Share
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/" className="hover:text-sky-400 transition-colors flex items-center gap-2">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/semesters" className="hover:text-sky-400 transition-colors flex items-center gap-2">
                  Semesters
                </Link>
              </li>
              <li>
                <Link to="/upload" className="hover:text-sky-400 transition-colors flex items-center gap-2">
                  Upload PDF
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-sky-400 transition-colors flex items-center gap-2">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Categories */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Academic Resources</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Question Banks</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Previous Question Papers</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Important Unit Questions</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Study Material PDFs</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} QB EXCHANGER. Centralized Academic Platform.</p>
          <p className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span>Built for students</span>
            <span>•</span>
            <span className="text-sky-400">Find</span>
            <span>•</span>
            <span className="text-teal-400">Learn</span>
            <span>•</span>
            <span className="text-indigo-400">Share</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
