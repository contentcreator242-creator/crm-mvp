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
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
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
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            {title ? <h2 className="text-base font-bold text-slate-900">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          {headerExtra ? <div className="flex shrink-0 flex-wrap gap-2">{headerExtra}</div> : null}
        </div>
      ) : null}
      <div className={paddingClass[padding]}>{children}</div>
    </section>
  );
}
