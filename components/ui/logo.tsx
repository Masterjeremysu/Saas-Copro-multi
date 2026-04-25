'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  withText?: boolean;
  variant?: 'light' | 'dark' | 'white';
}

export function Logo({ className = "", withText = true, variant = 'dark' }: LogoProps) {
  const isWhite = variant === 'white';
  const isLight = variant === 'light';
  
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <motion.div 
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="relative flex items-center justify-center shrink-0"
      >
        {/* Deep Glow Aura */}
        <div className={`absolute -inset-4 rounded-full opacity-30 blur-2xl animate-pulse ${isWhite ? 'bg-white' : 'bg-indigo-500'}`}></div>
        
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 filter drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]"
        >
          {/* Outer Orbital Ring */}
          <circle cx="24" cy="24" r="22" stroke={isWhite ? "white" : "url(#logo-grad-1)"} strokeWidth="1" strokeDasharray="4 4" className="opacity-40 animate-[spin_20s_linear_infinite]" />
          
          {/* The Interlocking "S" - The Sync Symbol */}
          <path 
            d="M32 16C32 11.5817 28.4183 8 24 8C19.5817 8 16 11.5817 16 16V22H32V16Z" 
            fill={isWhite ? "white" : "url(#logo-grad-2)"}
          />
          <path 
            d="M16 32C16 36.4183 19.5817 40 24 40C28.4183 40 32 36.4183 32 32V26H16V32Z" 
            fill={isWhite ? "white" : "url(#logo-grad-2)"}
          />
          
          {/* Inner Connector Bridge */}
          <rect x="21" y="21" width="6" height="6" rx="3" fill={isWhite ? "#4F46E5" : "white"} />
          
          {/* Floating Data Nodes */}
          <circle cx="24" cy="8" r="2" fill={isWhite ? "white" : "#818CF8"} className="animate-pulse" />
          <circle cx="24" cy="40" r="2" fill={isWhite ? "white" : "#818CF8"} className="animate-pulse" />

          {/* Gradients */}
          <defs>
            <linearGradient id="logo-grad-1" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818CF8" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="logo-grad-2" x1="16" y1="8" x2="32" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="0.5" stopColor="#4F46E5" />
              <stop offset="1" stopColor="#3730A3" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {withText && (
        <div className="flex flex-col -space-y-1">
          <span className={`text-2xl font-black tracking-tighter uppercase italic pr-4 transition-all duration-500 group-hover:tracking-normal ${
            isWhite ? 'text-white' : isLight ? 'text-slate-200' : 'text-slate-900 dark:text-white'
          }`}>
            Copro<span className="text-indigo-600 drop-shadow-[0_0_10px_rgba(79,70,229,0.5)]">Sync</span>
          </span>
          <span className={`text-[8px] font-black tracking-[0.4em] uppercase opacity-40 ml-1 ${isWhite ? 'text-white' : 'text-slate-500'}`}>
            Mission Control
          </span>
        </div>
      )}
    </div>
  );
}
