import type { ReactNode } from "react";
import Link from "next/link";
import type { LenderMatchDisplayRow } from "@/lib/ui/lenderMatchDisplay";
import {
  fitRatingLabel,
  formatMatchScorePercent,
  getGlobalTopMatch,
  LENDER_MATCH_GOOD_SCORE_MIN,
} from "@/lib/ui/lenderMatchDisplay";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function reliabilityPill(rel: "high" | "medium" | "low" | null) {
  if (!rel) return null;
  const label =
    rel === "high" ? "High data confidence" : rel === "medium" ? "Medium data confidence" : "Low data confidence";
  const cls =
    rel === "high"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : rel === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function MatchRowCard({
  row,
  variant,
  isTopPick,
  trackable,
}: {
  row: LenderMatchDisplayRow;
  variant: "strong" | "possible" | "rejected";
  isTopPick: boolean;
  /** Show checkbox to add this org lender to the deal when resolved. */
  trackable: boolean;
}) {
  const rating = fitRatingLabel(row.score, row.tier);
  const pct = formatMatchScorePercent(row.score);

  const ring =
    isTopPick && variant !== "rejected"
      ? "ring-2 ring-emerald-500/90 ring-offset-2 ring-offset-white"
      : "";
  const baseCard =
    variant === "strong"
      ? "border-emerald-200/90 bg-white"
      : variant === "possible"
        ? "border-amber-200/90 bg-white"
        : "border-rose-100 bg-slate-50/80";

  return (
    <li
      className={`relative rounded-xl border px-4 py-3 text-sm shadow-sm ${baseCard} ${ring}`}
    >
      {isTopPick && variant !== "rejected" ? (
        <div className="absolute -top-2.5 left-3 flex items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            Top match
          </span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${isTopPick && variant !== "rejected" ? "pt-2" : ""}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            {trackable ? (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  name="lenderIds"
                  value={row.resolvedLenderId ?? ""}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-900">{row.lenderName}</span>
              </label>
            ) : (
              <span className="font-semibold text-slate-900">{row.lenderName}</span>
            )}
            <span className="tabular-nums text-xs font-medium text-slate-500">#{row.rank}</span>
          </div>
          {variant !== "rejected" && !row.resolvedLenderId ? (
            <p className="mt-1 text-[11px] text-amber-800">
              Name not linked to your Lenders list — add a lender with this exact name to enable tracking.
            </p>
          ) : null}
          {row.keyReasons.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs leading-snug text-slate-600">
              {row.keyReasons.slice(0, 4).map((reason, i) => (
                <li key={`${row.key}-${i}`} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : row.explanation ? (
            <p className="mt-2 text-xs leading-snug text-slate-600">{row.explanation}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end sm:text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={`text-lg font-bold tabular-nums tracking-tight ${
                variant === "rejected" ? "text-slate-500" : "text-slate-900"
              }`}
            >
              {variant === "rejected" ? (row.score === 0 ? "0%" : "—") : pct}
            </span>
            {variant !== "rejected" ? (
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800">
                {rating}
              </span>
            ) : (
              <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900">
                Rejected
              </span>
            )}
          </div>
          {reliabilityPill(row.criteriaReliability)}
        </div>
      </div>
    </li>
  );
}

export function LenderMatchSection({
  leadId,
  latestLenderMatch,
  displayRows,
  goodMatches,
  borderlineMatches,
  failedMatches,
  hasJsonFallback,
  trackLendersAction,
  refreshMatchesSlot,
}: {
  leadId: string;
  latestLenderMatch: { createdAt: Date };
  displayRows: LenderMatchDisplayRow[];
  goodMatches: LenderMatchDisplayRow[];
  borderlineMatches: LenderMatchDisplayRow[];
  failedMatches: LenderMatchDisplayRow[];
  hasJsonFallback: boolean;
  trackLendersAction: (formData: FormData) => Promise<void>;
  /** e.g. “Refresh matches” form */
  refreshMatchesSlot?: ReactNode;
}) {
  const topPick = getGlobalTopMatch(displayRows);
  const topKey = topPick?.key ?? null;

  const groups = [
    {
      id: "strong",
      title: "Strong matches",
      lead: "Start here — these lenders fit your rules best.",
      foot: `Scores ≥ ${LENDER_MATCH_GOOD_SCORE_MIN}% after eligibility.`,
      rows: goodMatches,
      variant: "strong" as const,
      wrap: "border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white",
      titleAccent: "text-emerald-950",
    },
    {
      id: "possible",
      title: "Possible matches",
      lead: "Secondary options — weaker score or tighter fit; confirm with the lender.",
      foot: `Eligible, but below the “strong” band (${LENDER_MATCH_GOOD_SCORE_MIN - 1}% or lower).`,
      rows: borderlineMatches,
      variant: "possible" as const,
      wrap: "border-amber-200/80 bg-gradient-to-b from-amber-50/60 to-white",
      titleAccent: "text-amber-950",
    },
    {
      id: "rejected",
      title: "Rejected",
      lead: "Excluded by your criteria — not a fit for this lead as scored.",
      foot: "Failed a hard rule (shown as 0% fit).",
      rows: failedMatches,
      variant: "rejected" as const,
      wrap: "border-rose-200/70 bg-gradient-to-b from-rose-50/50 to-white",
      titleAccent: "text-rose-950",
    },
  ];

  return (
    <section className="mt-10 border-t border-slate-100 pt-8 lg:mt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Lender fit</h2>
          <p className="mt-1 text-xs text-slate-600">
            Prioritize outreach using fit scores — strongest options first. Percentages reflect the internal match
            model (0–100%), not a lender guarantee.
          </p>
        </div>
        {refreshMatchesSlot ? <div className="shrink-0">{refreshMatchesSlot}</div> : null}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Last analyzed{" "}
        <span className="tabular-nums font-medium text-slate-600">
          {formatDateTime(latestLenderMatch.createdAt)}
        </span>{" "}
        UTC · {displayRows.length} lender{displayRows.length === 1 ? "" : "s"}
        {hasJsonFallback ? (
          <span className="text-amber-700"> · detail rows missing (showing stored snapshot)</span>
        ) : null}
      </p>

      {topPick && (
        <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-emerald-400/70 bg-gradient-to-br from-emerald-50 via-white to-white px-5 py-5 shadow-md">
          <div className="absolute right-3 top-3 opacity-[0.07]" aria-hidden>
            <span className="text-7xl font-black text-emerald-900">1</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Recommended first step</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{topPick.lenderName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-black tabular-nums text-emerald-900">
              {formatMatchScorePercent(topPick.score)}
            </span>
            <span className="text-sm font-semibold text-slate-700">·</span>
            <span className="text-sm font-semibold text-emerald-900">
              {fitRatingLabel(topPick.score, topPick.tier)}
            </span>
            {reliabilityPill(topPick.criteriaReliability)}
          </div>
          {topPick.keyReasons.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
              {topPick.keyReasons.slice(0, 3).map((reason, i) => (
                <li key={`top-${i}`} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <form action={trackLendersAction} className="mt-6">
        <input type="hidden" name="leadId" value={leadId} />
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Track multiple lenders</p>
          <p className="mt-1 leading-relaxed">
            Tick the lenders you want on this lead&apos;s deal, then add them in one go. You complete applications on
            each lender&apos;s website — update status per lender on the deal page.
          </p>
        </div>

        <div className="mt-1 space-y-6">
          {groups.map(
            (group) =>
              group.rows.length > 0 && (
                <div key={group.id} className={`rounded-2xl border px-4 py-4 sm:px-5 ${group.wrap}`}>
                  <h3 className={`text-sm font-bold ${group.titleAccent}`}>{group.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{group.lead}</p>
                  <ol className="mt-4 list-none space-y-3 p-0">
                    {group.rows.map((row) => (
                      <MatchRowCard
                        key={row.key}
                        row={row}
                        variant={group.variant}
                        isTopPick={topKey != null && row.key === topKey}
                        trackable={group.variant !== "rejected" && Boolean(row.resolvedLenderId)}
                      />
                    ))}
                  </ol>
                  <p className="mt-3 text-[10px] text-slate-500">{group.foot}</p>
                </div>
              ),
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="adm-btn-primary text-sm">
            Add selected lenders to deal
          </button>
          <span className="text-[11px] text-slate-500">Creates or reuses one deal for this lead.</span>
        </div>
      </form>

      <p className="mt-4 text-[10px] text-slate-400">
        Tune criteria in{" "}
        <Link href="/lenders" className="font-medium text-slate-600 underline">
          Lenders
        </Link>
        . Results update when the public lead form is submitted or you refresh matches here.
      </p>
    </section>
  );
}
