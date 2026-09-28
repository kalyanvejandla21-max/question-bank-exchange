import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Search, Upload, LayoutDashboard, Menu, X, LogOut, Sparkles, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Semesters', path: '/semesters', icon: BookOpen },
    { label: 'Search', path: '/search', icon: Search }
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left: Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-teal-400 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300"></div>
              <img 
                src="/logo.png" 
                alt="QB Exchanger Logo" 
                className="relative w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-slate-700/60 bg-slate-950 p-1 transition-transform group-hover:scale-105" 
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-none">
                  QB <span className="bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">EXCHANGER</span>
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Academic PDF Exchange</span>
            </div>
          </Link>

          {/* Desktop Search Input */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center flex-1 max-w-sm mx-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search question banks, subjects, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500/80 rounded-full py-2 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Desktop Nav Items & Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    active 
                      ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-sky-400' : 'text-slate-400'}`} />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-sky-400 to-teal-300 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <Link
              to="/upload"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                isActive('/upload')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Upload PDF
            </Link>

            <Link
              to="/admin"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                isActive('/admin')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-teal-400" />
              Admin
            </Link>

            {isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  navigate('/admin/login');
                }}
                className="ml-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5"
                title="Logout Admin Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center md:hidden gap-2">
            <Link
              to="/search"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 overflow-hidden shadow-2xl"
          >
            <form onSubmit={handleSearchSubmit} className="mb-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search resources, subjects, years..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </form>

            <div className="grid grid-cols-1 gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs ${
                  isActive('/') ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Home className="w-4 h-4 text-sky-400" />
                Home
              </Link>

              <Link
                to="/semesters"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs ${
                  isActive('/semesters') ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                Semesters
              </Link>

              <Link
                to="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs ${
                  isActive('/upload') ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Upload className="w-4 h-4 text-teal-400" />
                Upload PDF
              </Link>

              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs ${
                  isActive('/admin') ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                Admin Dashboard
              </Link>

              {isAuthenticated && (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/admin/login');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 font-medium text-xs border border-rose-500/20 mt-2"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  Logout Admin
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
