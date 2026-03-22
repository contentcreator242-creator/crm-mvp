import type { ReactNode } from "react";

/** Tones aligned with `StatCard` for marketing / dashboard visual consistency. */
const toneBorder: Record<
  "default" | "emerald" | "amber" | "rose" | "violet" | "slate",
  string
> = {
  default: "border-slate-200/90",
  emerald: "border-emerald-200/80",
  amber: "border-amber-200/80",
  rose: "border-rose-200/80",
  violet: "border-violet-200/80",
  slate: "border-slate-200/90",
};

const toneAccent: Record<
  "default" | "emerald" | "amber" | "rose" | "violet" | "slate",
  string
> = {
  default: "from-slate-50/80",
  emerald: "from-emerald-50/50",
  amber: "from-amber-50/40",
  rose: "from-rose-50/40",
  violet: "from-violet-50/40",
  slate: "from-slate-100/60",
};

export function FeatureHighlightCard({
  title,
  description,
  tone = "default",
  icon,
}: {
  title: string;
  description: string;
  tone?: keyof typeof toneBorder;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${toneAccent[tone]} to-white p-6 shadow-adm sm:p-7 ${toneBorder[tone]}`}
    >
      {icon ? (
        <div className="absolute right-5 top-5 text-slate-400 opacity-90 [&_svg]:h-7 [&_svg]:w-7">{icon}</div>
      ) : null}
      <p className="pr-14 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
