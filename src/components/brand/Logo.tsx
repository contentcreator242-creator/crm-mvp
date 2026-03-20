import Link from "next/link";

/** Primary brand blue — keep in sync across marketing + app chrome */
export const LENDEX_BRAND_HEX = "#2563EB";

type LogoProps = {
  className?: string;
  /** `onDark`: muted subtitle for dark sidebars (wordmark stays brand blue) */
  variant?: "default" | "onDark";
  size?: "sm" | "md";
  showIcon?: boolean;
  /** Optional second line under the wordmark */
  tagline?: string;
  /** Set `null` to render non-clickable wordmark */
  href?: string | null;
};

function LendexIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill={LENDEX_BRAND_HEX} fillOpacity="0.14" />
      <path
        d="M9 23V11m4.5 12V15M18 23v-6m4.5 6V9"
        stroke={LENDEX_BRAND_HEX}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Text-based Lendex wordmark with optional minimal mark (bar chart / upward signal).
 * Use in shell layout, auth pages, or marketing.
 */
export function Logo({
  className = "",
  variant = "default",
  size = "md",
  showIcon = true,
  tagline,
  href = "/dashboard",
}: LogoProps) {
  const iconSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textSize = size === "sm" ? "text-lg" : "text-xl";
  const subSize = size === "sm" ? "text-[10px]" : "text-xs";

  const subMuted = variant === "onDark" ? "text-slate-500" : "text-slate-400";

  const content = (
    <span className={`inline-flex items-center gap-2.5 font-sans ${className}`}>
      {showIcon ? <LendexIcon className={`${iconSize} shrink-0`} /> : null}
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={`${textSize} font-bold tracking-tight antialiased`}
          style={{ color: LENDEX_BRAND_HEX }}
        >
          Lendex
        </span>
        {tagline ? (
          <span className={`${subSize} mt-1 font-medium uppercase tracking-widest ${subMuted}`}>
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (href == null) {
    return <span className="inline-flex">{content}</span>;
  }

  return (
    <Link
      href={href}
      className="inline-flex rounded-lg outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
    >
      {content}
    </Link>
  );
}
