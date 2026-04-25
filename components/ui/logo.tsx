import React from 'react';

interface LogoProps {
  className?: string;
  withText?: boolean;
  variant?: 'light' | 'dark' | 'white';
}

export function Logo({ className = "", withText = true, variant = 'dark' }: LogoProps) {
  const isWhite = variant === 'white';
  const isLight = variant === 'light';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        {/* Sync Ring Animation */}
        <div className={`absolute -inset-1.5 rounded-xl opacity-20 blur-sm animate-pulse ${isWhite ? 'bg-white' : 'bg-indigo-500'}`}></div>
        
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-xl"
        >
          {/* Main Shield/Hexagon Base */}
          <path 
            d="M20 4L34 11V29L20 36L6 29V11L20 4Z" 
            fill={isWhite ? "white" : "url(#logo-gradient)"}
          />
          
          {/* Building Silhouette */}
          <path d="M14 26V18H18V26H14Z" fill={isWhite ? "#4F46E5" : "white"} fillOpacity="0.9" />
          <path d="M20 26V14H24V26H20Z" fill={isWhite ? "#4F46E5" : "white"} fillOpacity="1" />
          <path d="M26 26V20H30V26H26Z" fill={isWhite ? "#4F46E5" : "white"} fillOpacity="0.7" />
          
          {/* Sync Node */}
          <circle cx="20" cy="10" r="2.5" fill={isWhite ? "#4F46E5" : "white"} />
          
          {/* Definition of Gradient */}
          <defs>
            <linearGradient id="logo-gradient" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {withText && (
        <span className={`text-2xl font-black tracking-tighter uppercase italic pr-2 transition-colors duration-300 ${
          isWhite ? 'text-white' : isLight ? 'text-slate-200' : 'text-slate-900 dark:text-white'
        }`}>
          Copro<span className="text-indigo-600">Sync</span>
        </span>
      )}
    </div>
  );
}
