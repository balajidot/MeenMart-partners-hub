import React from 'react';

export default function BrandLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MeenMart logo"
    >
      <rect width="36" height="36" rx="10" fill="url(#mm-logo-grad)" />
      {/* Modern geometric M monogram with sleek wave accent */}
      <path
        d="M10 24.5V11.5L18 18.5L26 11.5V24.5"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 25C15.5 23.2 20.5 23.2 22.5 25"
        stroke="#54D6C4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="mm-logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16224A" />
          <stop offset="1" stopColor="#0F9E8E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
