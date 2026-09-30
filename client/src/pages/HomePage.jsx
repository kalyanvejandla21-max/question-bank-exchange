import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, FileText, ArrowRight, Sparkles, Layers, ShieldCheck, Compass, Eye, Search, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSemesters, getResources, getSubjects, getAdminStats } from '../services/api';
import FlowField from '../components/FlowField';
import SemesterCard from '../components/SemesterCard';
import ResourceCard from '../components/ResourceCard';
import SubjectCard from '../components/SubjectCard';
import PdfViewerModal from '../components/PdfViewerModal';

const DEFAULT_SEMESTERS = [
  { id: 'sem-3-1', name: '3-1', title: 'Semester 3-1', description: 'Question Banks, Papers & Study Material for 3-1', subjectCount: 0, resourceCount: 0 },
  { id: 'sem-3-2', name: '3-2', title: 'Semester 3-2', description: 'Question Banks, Papers & Study Material for 3-2', subjectCount: 0, resourceCount: 0 },
  { id: 'sem-4-1', name: '4-1', title: 'Semester 4-1', description: 'Question Banks, Papers & Study Material for 4-1', subjectCount: 0, resourceCount: 0 },
  { id: 'sem-4-2', name: '4-2', title: 'Semester 4-2', description: 'Question Banks, Papers & Study Material for 4-2', subjectCount: 0, resourceCount: 0 }
];

export default function HomePage() {
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [recentResources, setRecentResources] = useState([]);
  const [popularSubjects, setPopularSubjects] = useState([]);
  const [stats, setStats] = useState({
    totalSemesters: 4,
    totalSubjects: 0,
    totalPdfs: 0,
    totalDownloads: 0
  });
  const [loading, setLoading] = useState(true);
  const [viewingResource, setViewingResource] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        // Fetch independent endpoints in parallel using Promise.allSettled
        const [semResult, resResult, subjResult] = await Promise.allSettled([
          getSemesters(),
          getResources(),
          getSubjects()
        ]);

        if (!isMounted) return;

        let currentSemesters = DEFAULT_SEMESTERS;
        let currentResources = [];
        let currentSubjects = [];

        if (semResult.status === 'fulfilled' && semResult.value) {
          const semRes = semResult.value;
          const semData = Array.isArray(semRes?.data) 
            ? semRes.data 
            : (Array.isArray(semRes?.data?.data) ? semRes.data.data : []);
          if (semData && semData.length > 0) {
            currentSemesters = semData;
            setSemesters(semData);
          }
        }

        if (resResult.status === 'fulfilled' && resResult.value) {
          const resRes = resResult.value;
          const resData = Array.isArray(resRes?.data) 
            ? resRes.data 
            : (Array.isArray(resRes?.data?.data) ? resRes.data.data : []);
          currentResources = resData;
          setRecentResources(resData.slice(0, 6));
        }

        if (subjResult.status === 'fulfilled' && subjResult.value) {
          const subjRes = subjResult.value;
          const subjData = Array.isArray(subjRes?.data) 
            ? subjRes.data 
            : (Array.isArray(subjRes?.data?.data) ? subjRes.data.data : []);
          currentSubjects = subjData;
          const sortedSubjs = [...subjData].sort((a, b) => (b.resourceCount || 0) - (a.resourceCount || 0));
          setPopularSubjects(sortedSubjs.slice(0, 6));
        }

        const calculatedDownloads = currentResources.reduce((acc, r) => acc + (r.downloadsCount || 0), 0);
        setStats({
          totalSemesters: currentSemesters.length || 4,
          totalSubjects: currentSubjects.length || 0,
          totalPdfs: currentResources.length || 0,
          totalDownloads: calculatedDownloads || 0
        });

      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const howItWorksSteps = [
    {
      step: '01',
      title: 'Find',
      description: 'Browse your semester and subject to locate verified question banks and notes.',
      icon: Search,
      badgeColor: 'text-sky-400 border-sky-500/20 bg-sky-500/10'
    },
    {
      step: '02',
      title: 'View',
      description: 'Open question banks and study materials instantly with our fast PDF viewer.',
      icon: Eye,
      badgeColor: 'text-teal-400 border-teal-500/20 bg-teal-500/10'
    },
    {
      step: '03',
      title: 'Share',
      description: 'Upload useful PDFs to help fellow students prepare for exams.',
      icon: Upload,
      badgeColor: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10'
    }
  ];

  return (
    <div className="space-y-20 pb-20 overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center py-20 border-b border-slate-800/80 bg-[#07090e] overflow-hidden">
        {/* FlowField Canvas Background */}
        <FlowField />

        {/* Ambient Subtle Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07090e]/60 to-[#07090e] pointer-events-none z-0" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center w-full">
          
          {/* Trust/Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium mb-8 shadow-xl backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Built for students • Find • Learn • Share</span>
          </motion.div>

          {/* Hero Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6"
          >
            Your Question Bank.<br />
            <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              All in One Place.
            </span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Find question banks, previous papers, important questions and study materials shared by your academic community.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16"
          >
            <Link
              to="/semesters"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 group border border-sky-400/30"
            >
              Explore Question Banks
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/upload"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-200 font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md shadow-lg"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              Upload PDF
            </Link>
          </motion.div>

          {/* Platform Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/60"
          >
            <div className="bg-[#0d111a]/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-left backdrop-blur-md">
              <span className="text-2xl sm:text-4xl font-extrabold text-white block mb-0.5">
                {stats.totalSemesters || 4}
              </span>
              <span className="text-xs text-slate-400 font-medium">Semesters</span>
            </div>

            <div className="bg-[#0d111a]/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-left backdrop-blur-md">
              <span className="text-2xl sm:text-4xl font-extrabold text-white block mb-0.5">
                {stats.totalSubjects || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">Subjects</span>
            </div>

            <div className="bg-[#0d111a]/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-left backdrop-blur-md">
              <span className="text-2xl sm:text-4xl font-extrabold text-sky-400 block mb-0.5">
                {stats.totalPdfs || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">PDF Resources</span>
            </div>

            <div className="bg-[#0d111a]/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-left backdrop-blur-md">
              <span className="text-2xl sm:text-4xl font-extrabold text-teal-400 block mb-0.5">
                {stats.totalDownloads || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">Downloads</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 1. BROWSE BY SEMESTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 pb-4 border-b border-slate-800/60"
        >
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              Semester Catalog
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Browse by Semester
            </h2>
          </div>
          <Link 
            to="/semesters" 
            className="text-sky-400 text-xs font-bold hover:text-sky-300 flex items-center gap-1 mt-3 sm:mt-0 transition-colors"
          >
            View All Semesters <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-[#0d111a] animate-pulse border border-slate-800" />
            ))
          ) : (
            semesters.map((sem) => (
              <SemesterCard key={sem.id || sem.name} semester={sem} />
            ))
          )}
        </div>
      </section>

      {/* 2. RECENTLY ADDED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 pb-4 border-b border-slate-800/60"
        >
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Fresh Additions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Recently Added PDFs
            </h2>
          </div>
          <Link 
            to="/search" 
            className="text-sky-400 text-xs font-bold hover:text-sky-300 flex items-center gap-1 mt-3 sm:mt-0 transition-colors"
          >
            Browse All Resources <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#0d111a] animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : recentResources.length > 0 ? (
          <div className="space-y-4">
            {recentResources.map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                onView={(r) => setViewingResource(r)}
                onDownloadSuccess={(id) => {
                  setRecentResources(prev =>
                    prev.map(item => item.id === id ? { ...item, downloadsCount: (item.downloadsCount || 0) + 1 } : item)
                  );
                  setStats(prev => ({ ...prev, totalDownloads: prev.totalDownloads + 1 }));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#0d111a]/80 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No resources uploaded yet. Be the first to upload a question bank PDF!
          </div>
        )}
      </section>

      {/* 3. POPULAR SUBJECTS */}
      {popularSubjects.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 pb-4 border-b border-slate-800/60"
          >
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Layers className="w-3.5 h-3.5" />
                Featured Courses
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Popular Subjects
              </h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularSubjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </section>
      )}

      {/* 4. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0d111a]/90 border border-slate-800/90 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
              <Compass className="w-4 h-4" />
              Simple Process
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
              How QB Exchanger Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Designed for fast exam preparation. Access study materials in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {howItWorksSteps.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-[#07090e]/90 border border-slate-800/80 rounded-2xl p-6 relative flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.badgeColor}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-3xl font-extrabold text-slate-700 font-mono">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PDF VIEWER MODAL */}
      {viewingResource && (
        <PdfViewerModal
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
        />
      )}

    </div>
  );
}
