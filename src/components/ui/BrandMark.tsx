// Hand-drawn butterfly mark, paired with the wordmark. Two mirrored wings
// rendered as cubic curves; each wing is a single path so we can animate the
// stroke or do a wing-fold gesture later if we want.

import * as React from "react";

export interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Optional accent override. Defaults to currentColor for the body. */
  accent?: string;
}

export function BrandMark({ size = 22, className, accent }: BrandMarkProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Cavoti"
      className={className}
      fill="none"
    >
      {/* Body — a slim spindle */}
      <path
        d="M12 4 C 12.6 9, 12.6 15, 12 20"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Left wing */}
      <path
        d="M11.6 6 C 6 4.5, 2.5 8, 4 12 C 5 14.6, 8.5 14.5, 11.6 12.4 Z"
        fill={accent ?? "currentColor"}
        opacity="0.92"
      />
      <path
        d="M11.6 12.4 C 8.5 13.4, 5.5 16.6, 7 19 C 8.6 21, 11 19.6, 11.6 17.6 Z"
        fill={accent ?? "currentColor"}
        opacity="0.6"
      />
      {/* Right wing — mirrored */}
      <path
        d="M12.4 6 C 18 4.5, 21.5 8, 20 12 C 19 14.6, 15.5 14.5, 12.4 12.4 Z"
        fill={accent ?? "currentColor"}
        opacity="0.92"
      />
      <path
        d="M12.4 12.4 C 15.5 13.4, 18.5 16.6, 17 19 C 15.4 21, 13 19.6, 12.4 17.6 Z"
        fill={accent ?? "currentColor"}
        opacity="0.6"
      />
      {/* Antennae */}
      <path
        d="M11.7 4.4 C 11.2 3.5, 10 3.2, 9.4 3.6"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M12.3 4.4 C 12.8 3.5, 14 3.2, 14.6 3.6"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
