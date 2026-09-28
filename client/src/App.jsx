import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SemestersPage from './pages/SemestersPage';
import SemesterDetailPage from './pages/SemesterDetailPage';
import SubjectDetailPage from './pages/SubjectDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import UploadPage from './pages/UploadPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/semesters" element={<SemestersPage />} />
              <Route path="/semesters/:semesterName" element={<SemesterDetailPage />} />
              <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
