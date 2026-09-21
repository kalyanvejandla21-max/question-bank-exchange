import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, FileText, ArrowRight, CheckCircle2, Search, TrendingUp, Sparkles, Folder, Layers } from 'lucide-react';
import { getSemesters, getResources, getAdminStats } from '../services/api';
import SemesterCard from '../components/SemesterCard';
import ResourceCard from '../components/ResourceCard';
import PdfViewerModal from '../components/PdfViewerModal';

export default function HomePage() {
  const [semesters, setSemesters] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [stats, setStats] = useState({ totalSemesters: 8, totalSubjects: 35, totalPdfs: 120, totalDownloads: 840 });
  const [loading, setLoading] = useState(true);
  const [viewingResource, setViewingResource] = useState(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const semRes = await getSemesters();
        if (semRes.success) setSemesters(semRes.data);

        const resRes = await getResources();
        if (resRes.success) setRecentResources(resRes.data.slice(0, 6));

        const statRes = await getAdminStats();
        if (statRes.success) setStats(statRes.data);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const resourceTypes = [
    { title: 'Question Banks', desc: 'Comprehensive unit-wise & course question banks', icon: FileText, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { title: 'Previous Papers', desc: 'Semester end exam question papers with answer keys', icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { title: 'Important Questions', desc: 'Curated 2-mark & 10-mark exam preparation lists', icon: Sparkles, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { title: 'Unit-wise PDFs', desc: 'Clean unit lecture notes and formula sheets', icon: Folder, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { title: 'Study Materials', desc: 'Complete course reference PDFs & textbooks', icon: Layers, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
  ];

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-sky-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <img 
                src="/logo.png" 
                alt="QBank Gold Emblem Logo" 
                className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-2xl border border-amber-500/40 bg-slate-950 p-2 shadow-2xl shadow-amber-500/20 backdrop-blur-md transform group-hover:scale-105 transition-all duration-300"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Centralized College Academic Exchange Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
            QBank <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-sky-400 bg-clip-text text-transparent">Exchanger</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            “All your semester question banks and academic PDFs in one place.”
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/semesters"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base transition-all duration-200 shadow-xl shadow-sky-600/25 flex items-center justify-center gap-2 group"
            >
              Explore Question Banks
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/upload"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5 text-sky-400" />
              Upload a Resource
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16 pt-8 border-t border-slate-800/80 text-left">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-2xl sm:text-3xl font-bold text-white block">{stats.totalSemesters || 8}</span>
              <span className="text-xs text-slate-400 font-medium">Semesters Available</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-2xl sm:text-3xl font-bold text-white block">{stats.totalSubjects || 35}</span>
              <span className="text-xs text-slate-400 font-medium">Academic Subjects</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-2xl sm:text-3xl font-bold text-sky-400 block">{stats.totalPdfs || 120}</span>
              <span className="text-xs text-slate-400 font-medium">Verified PDF Resources</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400 block">{stats.totalDownloads || 840}</span>
              <span className="text-xs text-slate-400 font-medium">Student Downloads</span>
            </div>
          </div>

        </div>
      </section>

      {/* Browse by Semester Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Browse by Semester</h2>
            <p className="text-sm text-slate-400">Select your semester to access course subjects and question papers.</p>
          </div>
          <Link to="/semesters" className="text-sky-400 text-sm font-semibold hover:underline flex items-center gap-1 mt-2 sm:mt-0">
            View All 4 Semesters <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
            ))
          ) : (
            semesters.map((sem) => (
              <SemesterCard key={sem.id} semester={sem} />
            ))
          )}
        </div>
      </section>

      {/* What You Can Find Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">What You Can Find</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every document is categorized for fast exam preparation. Download directly or preview inside your browser without forcing downloads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourceTypes.map((type, idx) => {
              const IconComp = type.icon;
              return (
                <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 transition-all hover:border-slate-700">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${type.color}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">{type.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Uploads Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Recently Added</h2>
            <p className="text-sm text-slate-400">Newly added question banks, previous papers, and study material PDFs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/search" className="text-sky-400 text-xs font-semibold hover:underline flex items-center gap-1">
              View All Resources <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/upload" className="hidden sm:flex px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 text-xs font-semibold items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Share your PDF
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {recentResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onView={(r) => setViewingResource(r)}
              onDownloadSuccess={(id) => {
                setRecentResources(prev => prev.map(item => item.id === id ? { ...item, downloadsCount: (item.downloadsCount || 0) + 1 } : item));
              }}
            />
          ))}
        </div>
      </section>

      {/* PDF Viewer Modal */}
      {viewingResource && (
        <PdfViewerModal
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
        />
      )}

    </div>
  );
}
