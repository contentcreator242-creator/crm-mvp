import type { DealLenderSubmissionStatus, DealSubmissionStatus } from "@prisma/client";
import {
  dealLenderSubmissionBadgeClass,
  dealLenderSubmissionLabel,
} from "@/lib/deals/dealLenderSubmissionLabels";
import { submissionStatusBadgeClass, submissionStatusLabel } from "@/lib/deals/submissionLabels";
import { updateDealLenderSubmissionAction } from "./dealSubmissionActions";

const STATUS_OPTIONS: DealLenderSubmissionStatus[] = [
  "selected",
  "submitted",
  "approved",
  "declined",
  "funded",
];

function formatDateTimeUtc(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export type DealLenderSubmissionRow = {
  id: string;
  status: DealLenderSubmissionStatus;
  submittedAt: Date | null;
  decisionAt: Date | null;
  notes: string | null;
  lender: { id: string; name: string };
};

export function DealLenderSubmissionsPanel({
  submissions,
  legacyLenderName,
  legacySubmissionStatus,
  legacySubmissionDate,
}: {
  submissions: DealLenderSubmissionRow[];
  legacyLenderName: string | null;
  legacySubmissionStatus: DealSubmissionStatus;
  legacySubmissionDate: Date | null;
}) {
  return (
    <div className="space-y-6 text-sm">
      {submissions.length === 0 && legacyLenderName ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-xs text-amber-950">
          <p className="font-semibold">Legacy single-lender data</p>
          <p className="mt-1 text-amber-900/90">
            This deal was saved before multi-lender tracking. Showing previous lender:{" "}
            <span className="font-medium">{legacyLenderName}</span> ·{" "}
            <span className={submissionStatusBadgeClass(legacySubmissionStatus)}>
              {submissionStatusLabel(legacySubmissionStatus)}
            </span>
            {legacySubmissionDate ? (
              <span className="ml-1 tabular-nums">· {formatDateTimeUtc(legacySubmissionDate)}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {submissions.length === 0 && !legacyLenderName ? (
        <p className="text-slate-600">
          No lenders tracked yet. From a lead&apos;s lender match, select lenders and use{" "}
          <span className="font-medium">Add selected lenders to deal</span>.
        </p>
      ) : null}

      <ul className="space-y-5">
        {submissions.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-200/90 bg-slate-50/40 px-4 py-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{s.lender.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className={dealLenderSubmissionBadgeClass(s.status)}>
                    {dealLenderSubmissionLabel(s.status)}
                  </span>
                </p>
              </div>
              <div className="text-xs tabular-nums text-slate-600">
                <p>Submitted: {formatDateTimeUtc(s.submittedAt)}</p>
                <p className="mt-0.5">Decision: {formatDateTimeUtc(s.decisionAt)}</p>
              </div>
            </div>

            <form action={updateDealLenderSubmissionAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="submissionId" value={s.id} />
              <div>
                <label htmlFor={`status-${s.id}`} className="crm-field-label">
                  Status
                </label>
                <select
                  id={`status-${s.id}`}
                  name="status"
                  defaultValue={s.status}
                  className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {dealLenderSubmissionLabel(opt)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`notes-${s.id}`} className="crm-field-label">
                  Notes
                </label>
                <textarea
                  id={`notes-${s.id}`}
                  name="notes"
                  rows={3}
                  defaultValue={s.notes ?? ""}
                  placeholder="Broker notes (e.g. portal link, reference number)"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <button type="submit" className="btn-secondary-sm">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-500">
        Applications are completed on each lender&apos;s site — update status here as you progress. Changes appear on the
        lead&apos;s activity timeline.
      </p>
    </div>
  );
}
