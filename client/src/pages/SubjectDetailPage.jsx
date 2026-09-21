import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubjectById, getResources } from '../services/api';
import ResourceCard from '../components/ResourceCard';
import PdfViewerModal from '../components/PdfViewerModal';
import EmptyState from '../components/EmptyState';
import { ArrowLeft, BookOpen, Upload, FileText, Search, Filter } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Question Bank',
  'Previous Question Paper',
  'Important Questions',
  'Unit-wise Questions',
  'Study Material'
];

export default function SubjectDetailPage() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingResource, setViewingResource] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const subjRes = await getSubjectById(subjectId);
        if (subjRes.success) {
          setSubject(subjRes.data);
        }

        const resData = await getResources({ subjectId });
        if (resData.success) {
          setResources(resData.data);
        }
      } catch (err) {
        console.error('Error loading subject resources:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [subjectId]);

  const filteredResources = resources.filter(res => {
    const matchesCategory = activeCategory === 'All' || res.category === activeCategory;
    const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          res.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back Link & Header */}
      <div>
        {subject && (
          <Link to={`/semesters/${subject.semester}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 font-medium mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to {subject.semester} Semester Subjects
          </Link>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            {subject && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                  {subject.code || 'COURSE'}
                </span>
                <span className="text-xs text-slate-400">Semester {subject.semester}</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              {subject ? subject.name : 'Subject Resources'}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Access previous semester question papers, unit question banks, and notes for this subject.
            </p>
          </div>

          <Link
            to="/upload"
            className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload PDF for this Subject
          </Link>
        </div>
      </div>

      {/* Category Tabs & Local Search */}
      <div className="space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search inside subject */}
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search in this subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          </div>

        </div>

      </div>

      {/* Resources List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="space-y-4">
          {filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onView={(res) => setViewingResource(res)}
              onDownloadSuccess={(id) => {
                setResources(prev => prev.map(r => r.id === id ? { ...r, downloadsCount: (r.downloadsCount || 0) + 1 } : r));
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No resources available yet."
          subtitle="Be the first student to upload a question bank."
          actionLabel="Upload Resource"
          actionLink="/upload"
        />
      )}

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
