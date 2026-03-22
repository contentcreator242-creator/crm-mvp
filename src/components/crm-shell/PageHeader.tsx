import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Primary actions (buttons, links) — right side on desktop */
  actions?: ReactNode;
  /** Breadcrumb or meta line above title */
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="adm-page-header mb-10 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="adm-eyebrow mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="adm-page-title text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="adm-page-desc mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
