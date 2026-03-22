import { Fragment } from "react";
import {
  LEAD_WORKFLOW_LABELS,
  LEAD_WORKFLOW_VALUES,
  formatLeadStatusLabel,
  normalizeLeadWorkflowStatus,
  type LeadWorkflowStatus,
} from "@/lib/leads/leadWorkflowStatus";

type UpdateWorkflowAction = (formData: FormData) => Promise<void>;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LeadWorkflowPanel({
  leadId,
  currentStatusRaw,
  updateWorkflowStatus,
}: {
  leadId: string;
  currentStatusRaw: string | null | undefined;
  updateWorkflowStatus: UpdateWorkflowAction;
}) {
  const current = normalizeLeadWorkflowStatus(currentStatusRaw);
  const currentIdx = LEAD_WORKFLOW_VALUES.indexOf(current);
  const nextIdx = currentIdx + 1;
  const hasNext = nextIdx < LEAD_WORKFLOW_VALUES.length;
  const nextStatus: LeadWorkflowStatus | null = hasNext ? LEAD_WORKFLOW_VALUES[nextIdx] : null;

  return (
    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Current:{" "}
          <span className="font-semibold text-slate-900">{formatLeadStatusLabel(current)}</span>
        </p>
      </div>

      {/* Horizontal stepper */}
      <div className="flex w-full items-center" aria-label="Lead workflow stages">
        {LEAD_WORKFLOW_VALUES.map((value, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          const label = LEAD_WORKFLOW_LABELS[value];

          const circleBase =
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:w-10 sm:text-sm";

          let circleClass = circleBase;
          if (isComplete) {
            circleClass += " bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-emerald-700";
          } else if (isCurrent) {
            circleClass +=
              " bg-violet-600 text-white shadow-md shadow-violet-600/25 ring-2 ring-violet-300 ring-offset-2 hover:bg-violet-500 focus-visible:outline-violet-700";
          } else {
            circleClass +=
              " border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-slate-400";
          }

          return (
            <Fragment key={value}>
              {i > 0 ? (
                <div
                  className={`mx-1 h-1 min-w-[8px] flex-1 rounded-full transition-colors ${
                    currentIdx > i - 1 ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              ) : null}
              <div className="flex min-w-0 max-w-[5.5rem] flex-1 flex-col items-center sm:max-w-none">
                <form action={updateWorkflowStatus} className="flex flex-col items-center">
                  <input type="hidden" name="leadId" value={leadId} />
                  <input type="hidden" name="workflowStatus" value={value} />
                  <button
                    type="submit"
                    className={circleClass}
                    title={`Set status to ${label}`}
                    aria-label={`Set status to ${label}`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isComplete ? (
                      <CheckIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    ) : (
                      <span className="tabular-nums">{i + 1}</span>
                    )}
                  </button>
                </form>
                <span
                  className={`mt-2 w-full px-0.5 text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                    isCurrent
                      ? "text-violet-900"
                      : isComplete
                        ? "text-emerald-900"
                        : "text-slate-400"
                  }`}
                  title={label}
                >
                  {label}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Primary action: advance one stage (same persistence as step clicks) */}
      <div className="mt-6 space-y-3 border-t border-slate-200/80 pt-4">
        {hasNext && nextStatus ? (
          <form action={updateWorkflowStatus}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="workflowStatus" value={nextStatus} />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="submit"
                className="adm-btn-primary inline-flex items-center gap-2 text-sm"
                title={`Sets status to ${LEAD_WORKFLOW_LABELS[nextStatus]}`}
              >
                <span>Move to next stage</span>
                <span className="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-bold">
                  {LEAD_WORKFLOW_LABELS[nextStatus]}
                </span>
              </button>
              <button type="submit" className="btn-secondary text-sm">
                Mark as {LEAD_WORKFLOW_LABELS[nextStatus]}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm font-medium text-slate-600">
            Final stage — use the steps above to move backward if needed.
          </p>
        )}

        <p className="text-xs text-slate-500">
          Click any stage in the bar to jump directly (new values match your CRM workflow).
        </p>
      </div>
    </div>
  );
}
