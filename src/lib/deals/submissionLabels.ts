import type { DealSubmissionStatus } from "@prisma/client";

export function submissionStatusLabel(status: DealSubmissionStatus): string {
  switch (status) {
    case "not_submitted":
      return "Not submitted";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function submissionStatusBadgeClass(status: DealSubmissionStatus): string {
  switch (status) {
    case "approved":
      return "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200";
    case "rejected":
      return "rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200";
    case "submitted":
      return "rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200";
    default:
      return "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200";
  }
}
