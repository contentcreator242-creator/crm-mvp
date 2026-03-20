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
    <div className="adm-page-header mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="adm-eyebrow mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="adm-page-title text-2xl font-bold tracking-tight text-slate-900 lg:text-[1.65rem]">
          {title}
        </h1>
        {description ? (
          <p className="adm-page-desc mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
