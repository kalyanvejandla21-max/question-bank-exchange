import React, { useState, useEffect } from 'react';
import { getSemesters } from '../services/api';
import SemesterCard from '../components/SemesterCard';
import { BookOpen, RefreshCw, AlertCircle } from 'lucide-react';

export default function SemestersPage() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSemesters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSemesters();
      const semestersData = Array.isArray(res?.data) 
        ? res.data 
        : (Array.isArray(res?.data?.data) ? res.data.data : []);
      if (res?.success || res?.data?.success || semestersData.length > 0) {
        setSemesters(semestersData);
      } else {
        setError('Unable to load semesters. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
      setError('Unable to load semesters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-4 border border-sky-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            Curriculum Structure (3-1 to 4-2)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Academic Semesters</h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Select your semester to view all registered subjects, unit notes, model papers, and previous year question banks.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-semibold text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchSemesters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Loading Semesters
          </button>
        </div>
      )}

      {/* Semesters Grid */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
            ))
          ) : (
            semesters.map((sem) => (
              <SemesterCard key={sem.id || sem.name} semester={sem} />
            ))
          )}
        </div>
      )}

    </div>
  );
}
