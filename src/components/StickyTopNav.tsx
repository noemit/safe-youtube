"use client";

import Link from "next/link";

interface StickyTopNavProps {
  backHref?: string;
  showBack?: boolean;
}

export function StickyTopNav({
  backHref = "/",
  showBack = true,
}: StickyTopNavProps) {
  return (
    <nav aria-label="Quick navigation" className="sticky-nav">
      {showBack ? (
        <Link
          aria-label="Go back"
          className="sticky-nav__button sticky-nav__button--back"
          href={backHref}
        >
          <svg aria-hidden="true" className="sticky-nav__icon" viewBox="0 0 24 24">
            <path
              d="M14.5 5.5L8 12l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
            <path
              d="M8.5 12h8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
          </svg>
          <span>BACK</span>
        </Link>
      ) : null}

      <Link
        aria-label="Go home"
        className="sticky-nav__button sticky-nav__button--home"
        href="/"
      >
        <svg aria-hidden="true" className="sticky-nav__icon" viewBox="0 0 24 24">
          <path
            d="M4 11.5L12 5l8 6.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M6.5 10.5V19h11v-8.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M10 19v-4.5h4V19"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
        </svg>
        <span>HOME</span>
      </Link>
    </nav>
  );
}
