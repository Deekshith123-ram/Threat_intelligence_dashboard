import React from 'react';

interface CyberGuardLogoProps {
  size?: number;
  className?: string;
}

export const CyberGuardLogo: React.FC<CyberGuardLogoProps> = ({ size = 34, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M32 5L54 13.5V30.5C54 44.5 44.6 55.6 32 59C19.4 55.6 10 44.5 10 30.5V13.5L32 5Z"
        className="fill-blue-600/15 stroke-blue-500 dark:fill-blue-500/15 dark:stroke-blue-400"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 12L47 18V30C47 40.5 40.3 48.8 32 51.6C23.7 48.8 17 40.5 17 30V18L32 12Z"
        className="fill-slate-900/5 stroke-cyan-600 dark:fill-slate-950/60 dark:stroke-cyan-400"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M32 21V42M24 30H40M27 25L32 21L37 25"
        className="stroke-cyan-600 dark:stroke-cyan-300"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="32"
        cy="30"
        r="3.2"
        className="fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-slate-950"
        strokeWidth="1.5"
      />
    </svg>
  );
};
