import Link from "next/link";

interface HomeButtonProps {
  href?: string;
}

export function HomeButton({ href = "/" }: HomeButtonProps) {
  return (
    <Link aria-label="Go home" className="home-button" href={href}>
      <svg
        aria-hidden="true"
        className="home-button__icon"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 11.5L12 5l8 6.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M6.5 10.5V19h11v-8.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M10 19v-4.5h4V19"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <span>HOME</span>
    </Link>
  );
}
