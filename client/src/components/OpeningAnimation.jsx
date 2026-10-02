import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Kokonut-style Monochrome Opening / Splash Animation Component
 * - Multi-ring white/grey circular loader
 * - Smooth entrance of TITLE & SUBTITLE (monochrome white/grey)
 * - Pure dark background (#000000)
 * - Exits automatically after ~2.5s revealing the website underneath
 * - Runs once per browser tab session
 */
export default function OpeningAnimation() {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('hasSeenSplash');
    } catch {
      return true;
    }
  });

  const [isExiting, setIsExiting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Detect user reduced motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Display sequence timer: 2.5s display, then trigger smooth exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    // Complete unmount after exit transition completes (2.5s display + 0.6s exit = 3.1s)
    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
      try {
        sessionStorage.setItem('hasSeenSplash', 'true');
      } catch (e) {
        // Safe fallback for restricted storage environments
      }
    }, 3100);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="opening-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.03, 
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-white overflow-hidden select-none pointer-events-auto"
        >
          {/* Loader & Text Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
            
            {/* Kokonut Multi-Ring Monochrome Loader */}
            <motion.div
              animate={prefersReducedMotion ? {} : { scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Primary Ring White/Grey Gradient */}
                  <linearGradient id="kokonut-ring-primary-mono" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                  </linearGradient>

                  {/* Outer Ring White/Grey Gradient */}
                  <linearGradient id="kokonut-ring-outer-mono" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.05" />
                  </linearGradient>

                  {/* Counter Ring White/Grey Gradient */}
                  <linearGradient id="kokonut-ring-counter-mono" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
                  </linearGradient>

                  {/* Subtle Soft White Glow Filter */}
                  <filter id="kokonut-splash-glow-mono" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* A. OUTER ROTATING RING (3s Cycle) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="url(#kokonut-ring-outer-mono)"
                  strokeWidth="1.2"
                  strokeDasharray="70 120"
                  strokeLinecap="round"
                  opacity="0.6"
                  animate={prefersReducedMotion ? {} : { rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "50px 50px" }}
                />

                {/* B. PRIMARY ANIMATED RING (2.5s Cycle - Prominent White) */}
                <g filter="url(#kokonut-splash-glow-mono)">
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="39"
                    stroke="url(#kokonut-ring-primary-mono)"
                    strokeWidth="2.2"
                    strokeDasharray="120 90"
                    strokeLinecap="round"
                    animate={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "50px 50px" }}
                  />
                </g>

                {/* C. SECONDARY COUNTER-ROTATING RING (4s Cycle - Opposite Direction) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="31"
                  stroke="url(#kokonut-ring-counter-mono)"
                  strokeWidth="1.2"
                  strokeDasharray="45 110"
                  strokeLinecap="round"
                  opacity="0.45"
                  animate={prefersReducedMotion ? {} : { rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "50px 50px" }}
                />

                {/* D. ACCENT PARTICLES RING (3.5s Cycle) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="23"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="4 14"
                  opacity="0.25"
                  animate={prefersReducedMotion ? {} : { rotate: 360 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "50px 50px" }}
                />
              </svg>

            </motion.div>

            {/* Entrance Title (Solid White/Light Slate) */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-widest uppercase mt-6 sm:mt-8 text-white"
            >
              QUESTION BANK EXCHANGE
            </motion.h1>

            {/* Entrance Subtitle (Subtle Grey) */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.75,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide mt-2.5"
            >
              Your Question Bank. All in One Place.
            </motion.p>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
