import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Heart, FileText, Shield, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="QBank Logo" 
                className="w-9 h-9 object-contain rounded-lg border border-amber-500/30 bg-slate-900/90 shadow-md shadow-amber-500/10" 
              />
              <span className="font-bold text-white text-lg tracking-tight">QBank <span className="text-amber-400">Exchanger</span></span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              A modern, open academic resource exchange built specifically for college students to effortlessly share, view, and download previous semester papers, question banks, and study notes.
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/semesters" className="hover:text-sky-400 transition-colors flex items-center gap-1">
                  Browse Semesters
                </Link>
              </li>
              <li>
                <Link to="/upload" className="hover:text-sky-400 transition-colors flex items-center gap-1">
                  Upload Resource
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-sky-400 transition-colors flex items-center gap-1">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Resource Types</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" /> Question Banks
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Previous Exam Papers
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Important Unit Questions
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" /> Study Notes & PDFs
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Question Bank Exchange. Built for college students.</p>
          <p className="flex items-center gap-1">
            Simple • Fast • Free Academic Resources
          </p>
        </div>
      </div>
    </footer>
  );
}
