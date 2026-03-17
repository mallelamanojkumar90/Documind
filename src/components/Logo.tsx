"use client";

import React from "react";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
}

export function Logo({ size = "medium", showText = true }: LogoProps) {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 64,
  };

  const iconSize = sizeMap[size];

  return (
    <div className="flex items-center gap-2">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DocuMind logo"
      >
        {/* Document rectangle with rounded corners */}
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="8"
          fill="#185FA5"
        />

        {/* Folded corner top-right */}
        <path
          d="M22 4 L28 4 L28 10 Z"
          fill="#F1EFE8"
          opacity="0.3"
        />

        {/* 3 horizontal line stubs inside (white, 55% opacity) */}
        <line
          x1="8"
          y1="12"
          x2="20"
          y2="12"
          stroke="white"
          strokeWidth="2"
          opacity="0.55"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="17"
          x2="20"
          y2="17"
          stroke="white"
          strokeWidth="2"
          opacity="0.55"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="22"
          x2="16"
          y2="22"
          stroke="white"
          strokeWidth="2"
          opacity="0.55"
          strokeLinecap="round"
        />

        {/* 3 small circuit-node dots at top corner */}
        <circle cx="24" cy="8" r="1.5" fill="#B5D4F4" />
        <circle cx="26" cy="11" r="1" fill="#B5D4F4" />
        <circle cx="22" cy="13" r="1" fill="#B5D4F4" />

        {/* Thin connecting lines for circuit nodes */}
        <line
          x1="24"
          y1="8"
          x2="26"
          y2="11"
          stroke="#B5D4F4"
          strokeWidth="0.5"
          opacity="0.6"
        />
        <line
          x1="24"
          y1="8"
          x2="22"
          y2="13"
          stroke="#B5D4F4"
          strokeWidth="0.5"
          opacity="0.6"
        />
      </svg>

      {showText && (
        <span
          className="heading-serif"
          style={{
            fontSize: size === "large" ? "28px" : size === "medium" ? "20px" : "14px",
            fontWeight: 400,
            color: "#185FA5",
          }}
        >
          <span style={{ fontWeight: 700 }}>Docu</span>
          <span style={{ fontWeight: 400 }}>Mind</span>
        </span>
      )}
    </div>
  );
}
