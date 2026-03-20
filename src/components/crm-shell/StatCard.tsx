import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  const toneBorder = {
    default: "border-slate-200/90",
    emerald: "border-emerald-200/80",
    amber: "border-amber-200/80",
    rose: "border-rose-200/80",
    violet: "border-violet-200/80",
    slate: "border-slate-200/90",
  }[tone];

  const toneAccent = {
    default: "from-slate-50/80",
    emerald: "from-emerald-50/50",
    amber: "from-amber-50/40",
    rose: "from-rose-50/40",
    violet: "from-violet-50/40",
    slate: "from-slate-100/60",
  }[tone];

  return (
    <div
      className={`adm-stat-card relative overflow-hidden rounded-2xl border bg-gradient-to-br ${toneAccent} to-white p-5 shadow-adm ${toneBorder}`}
    >
      {icon ? (
        <div className="absolute right-4 top-4 text-slate-300 opacity-90 [&_svg]:h-8 [&_svg]:w-8">{icon}</div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
