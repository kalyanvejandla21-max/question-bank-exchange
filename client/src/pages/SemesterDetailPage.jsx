import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubjects } from '../services/api';
import SubjectCard from '../components/SubjectCard';
import EmptyState from '../components/EmptyState';
import { ArrowLeft, BookOpen, Search, PlusCircle, Upload } from 'lucide-react';

export default function SemesterDetailPage() {
  const { semesterName } = useParams(); // e.g. "3-1"
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    async function fetchSemesterSubjects() {
      try {
        const res = await getSubjects(semesterName);
        const subjectsData = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res?.data?.data) ? res.data.data : []);
        if (res?.success || res?.data?.success || subjectsData.length > 0) {
          setSubjects(subjectsData);
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSemesterSubjects();
  }, [semesterName]);

  const filteredSubjects = subjects.filter(subj =>
    subj.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (subj.code && subj.code.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back Link & Header */}
      <div>
        <Link to="/semesters" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 font-medium mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to All Semesters
        </Link>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-3 border border-sky-500/20">
              <BookOpen className="w-3.5 h-3.5" />
              Semester {semesterName}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{semesterName} Semester Subjects</h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Select a subject below to view question banks, previous semester question papers, and study material PDFs.
            </p>
          </div>

          <Link
            to="/upload"
            className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload PDF for {semesterName}
          </Link>
        </div>
      </div>

      {/* Filter Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={`Filter ${semesterName} subjects...`}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing <strong className="text-white">{filteredSubjects.length}</strong> subjects
        </span>
      </div>

      {/* Subjects Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map(subj => (
            <SubjectCard key={subj.id} subject={subj} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No subjects found for ${semesterName}`}
          subtitle="Be the first to add or upload resources for this semester."
          actionLabel="Upload Resource"
          actionLink="/upload"
        />
      )}

    </div>
  );
}
