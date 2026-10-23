import Link from "next/link";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="Mazbien IntelliHub home">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="10" fill="#E8590C" />
        <path d="M8 24V11l9 8 9-8v13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="9" r="3" fill="#FFC247" />
      </svg>
      <span className={`font-display text-lg font-extrabold leading-none ${light ? "text-white" : "text-ink"}`}>
        Mazbien<span className={light ? "text-sun" : "text-brand"}> IntelliHub</span>
      </span>
    </Link>
  );
}
