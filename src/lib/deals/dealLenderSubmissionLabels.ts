import type { DealLenderSubmissionStatus } from "@prisma/client";

export function dealLenderSubmissionLabel(status: DealLenderSubmissionStatus): string {
  switch (status) {
    case "selected":
      return "Selected";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "funded":
      return "Funded";
    default:
      return status;
  }
}

export function dealLenderSubmissionBadgeClass(status: DealLenderSubmissionStatus): string {
  switch (status) {
    case "funded":
      return "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200";
    case "approved":
      return "rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200";
    case "declined":
      return "rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200";
    case "submitted":
      return "rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200";
    case "selected":
    default:
      return "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200";
  }
}
