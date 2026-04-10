"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const NAV_STACK_KEY = "safe-youtube-nav-stack";

interface StickyTopNavProps {
  backHref?: string;
}

function getLastItem(items: string[]): string | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

function readNavStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(NAV_STACK_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function writeNavStack(value: string[]) {
  try {
    window.sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(value.slice(-20)));
  } catch {
    // Ignore session storage errors and fall back to the explicit back href.
  }
}

export function StickyTopNav({ backHref = "/" }: StickyTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentHref = `${pathname}${search ? `?${search}` : ""}`;

  useEffect(() => {
    const stack = readNavStack();

    if (getLastItem(stack) === currentHref) {
      return;
    }

    const trimmedStack = stack.filter((item) => item !== currentHref);
    writeNavStack([...trimmedStack, currentHref]);
  }, [currentHref]);

  function goBack() {
    const stack = readNavStack();
    const trimmedStack =
      getLastItem(stack) === currentHref ? stack.slice(0, -1) : stack;
    const previousHref = getLastItem(trimmedStack);

    if (previousHref) {
      writeNavStack(trimmedStack);
      router.push(previousHref);
      return;
    }

    writeNavStack([]);
    router.push(backHref);
  }

  return (
    <nav aria-label="Quick navigation" className="sticky-nav">
      <button
        aria-label="Go back"
        className="sticky-nav__button sticky-nav__button--back"
        onClick={goBack}
        type="button"
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
      </button>

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
