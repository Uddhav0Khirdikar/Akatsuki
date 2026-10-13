import React from 'react';

export const AkatsukiCloud = ({ size = 36, className = '', glow = true }) => {
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 100 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'akatsuki-cloud-glow' : ''}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <filter id="cloud-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff1744" floodOpacity="0.75" />
        </filter>
        <linearGradient id="cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2233" />
          <stop offset="45%" stopColor="#d5001c" />
          <stop offset="100%" stopColor="#7a000f" />
        </linearGradient>
      </defs>

      {/* Outer White Contour of the Cloud */}
      <path
        d="M 28 55 
           C 15 55 6 45 6 33 
           C 6 22 15 14 26 14 
           C 28 8 35 3 45 3 
           C 56 3 66 10 68 18 
           C 72 15 78 14 84 16 
           C 93 19 98 28 97 37 
           C 99 43 97 49 92 53 
           C 87 56 80 56 75 55 
           C 70 55 63 55 58 55 
           L 28 55 Z"
        stroke="#ffffff"
        strokeWidth="3.2"
        fill="url(#cloud-grad)"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={glow ? 'url(#cloud-glow)' : undefined}
      />

      {/* Stylized Inner Cloud Swirl Lines (Classic Akatsuki motif) */}
      <path
        d="M 32 35
           C 28 32 26 27 28 23
           C 31 18 38 18 43 21
           C 49 25 48 33 42 37
           C 36 41 28 41 22 46"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      <path
        d="M 62 25
           C 66 22 72 23 75 27
           C 78 31 76 37 71 40
           C 67 42 61 41 58 45"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
};

export default AkatsukiCloud;
