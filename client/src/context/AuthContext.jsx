import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { adminLogin as loginApi, adminLogout as logoutApi, isAdminAuthenticated } from '../services/api';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute warning before expiry

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminAuthenticated());
  const [loading, setLoading] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const logout = useCallback(() => {
    logoutApi();
    setIsAuthenticated(false);
    setShowSessionWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowSessionWarning(false);
    resetTimers();
  }, []);

  const resetTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    if (!isAuthenticated) return;

    // Set warning timer (14 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowSessionWarning(true);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);

    // Set final logout timer (15 minutes)
    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  // Listen to user activity to refresh last activity timestamp (when warning not shown)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      // Only extend if warning isn't actively displaying
      if (!showSessionWarning) {
        lastActivityRef.current = Date.now();
        resetTimers();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));

    resetTimers();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [isAuthenticated, showSessionWarning, resetTimers]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await loginApi(credentials);
      if (res && res.success) {
        setIsAuthenticated(true);
        lastActivityRef.current = Date.now();
        resetTimers();
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid username or password' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Invalid username or password';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      loading,
      showSessionWarning,
      extendSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

