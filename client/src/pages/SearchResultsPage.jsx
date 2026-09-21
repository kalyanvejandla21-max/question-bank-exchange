import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchGlobal } from '../services/api';
import ResourceCard from '../components/ResourceCard';
import SubjectCard from '../components/SubjectCard';
import PdfViewerModal from '../components/PdfViewerModal';
import EmptyState from '../components/EmptyState';
import { Search, BookOpen, FileText, Filter } from 'lucide-react';

const SEMESTERS = ['All', '3-1', '3-2', '4-1', '4-2'];
const CATEGORIES = [
  'All',
  'Question Banks',
  'Previous Question Papers',
  'Important Questions',
  'Unit-wise Questions',
  'Study Materials',
  'Lab / Practical',
  'Other'
];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [results, setResults] = useState({ resources: [], subjects: [], totalResults: 0 });
  const [loading, setLoading] = useState(true);
  const [viewingResource, setViewingResource] = useState(null);

  useEffect(() => {
    async function performSearch() {
      setLoading(true);
      try {
        const res = await searchGlobal(query);
        if (res.success) {
          setResults(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }
    performSearch();
  }, [query]);

  // Filter resources client-side based on dropdown selections
  const filteredResources = (results.resources || []).filter(res => {
    if (semesterFilter !== 'All' && res.semester !== semesterFilter) return false;
    if (categoryFilter !== 'All' && res.category !== categoryFilter) return false;
    return true;
  });

  const filteredSubjects = (results.subjects || []).filter(subj => {
    if (semesterFilter !== 'All' && subj.semester !== semesterFilter) return false;
    return true;
  });

  const totalFilteredCount = filteredResources.length + filteredSubjects.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/20">
          <Search className="w-3.5 h-3.5" />
          Global Resource Search
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          {query ? <>Search Results for <span className="text-sky-400">“{query}”</span></> : 'All Platform Resources'}
        </h1>

        <p className="text-slate-400 text-sm">
          Found <strong className="text-white">{totalFilteredCount}</strong> matching academic resources & subjects.
        </p>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-sky-400" /> Filter By:
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Semester:</span>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
            >
              {SEMESTERS.map(sem => (
                <option key={sem} value={sem}>{sem === 'All' ? 'All Semesters (3-1 to 4-2)' : `${sem} Semester`}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          {(semesterFilter !== 'All' || categoryFilter !== 'All') && (
            <button
              onClick={() => { setSemesterFilter('All'); setCategoryFilter('All'); }}
              className="text-xs text-sky-400 hover:underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />
          <div className="h-24 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />
        </div>
      ) : totalFilteredCount > 0 ? (
        <div className="space-y-10">
          
          {/* Matching Subjects section */}
          {filteredSubjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                Matching Subjects ({filteredSubjects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubjects.map(subj => (
                  <SubjectCard key={subj.id} subject={subj} />
                ))}
              </div>
            </div>
          )}

          {/* Matching Resources section */}
          {filteredResources.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-400" />
                Matching PDF Resources ({filteredResources.length})
              </h2>
              <div className="space-y-4">
                {filteredResources.map(res => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    onView={(r) => setViewingResource(r)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <EmptyState
          title="No resources found."
          subtitle={query ? `We couldn't find any question banks or subjects matching "${query}" under the selected filters.` : "No resources found matching the selected semester/category filter."}
          actionLabel="Upload New Resource"
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

