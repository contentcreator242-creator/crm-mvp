import type { ReactNode } from "react";

type ContentCardProps = {
  title?: string;
  description?: string;
  /** Header right slot */
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingClass = {
  none: "",
  sm: "p-5 sm:p-6",
  md: "p-6 sm:p-8",
  lg: "p-7 sm:p-9",
};

export function ContentCard({
  title,
  description,
  headerExtra,
  children,
  className = "",
  padding = "md",
}: ContentCardProps) {
  const hasHeader = Boolean(title || description || headerExtra);

  return (
    <section className={`adm-content-card rounded-2xl border border-slate-200/90 bg-white shadow-adm ${className}`}>
      {hasHeader ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2> : null}
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
          {headerExtra ? <div className="flex shrink-0 flex-wrap gap-3">{headerExtra}</div> : null}
        </div>
      ) : null}
      <div className={paddingClass[padding]}>{children}</div>
    </section>
  );
}
