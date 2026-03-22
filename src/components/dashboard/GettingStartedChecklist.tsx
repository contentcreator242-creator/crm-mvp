import Link from "next/link";

export type OnboardingChecklistState = {
  firstLeadAt: Date | null;
  firstLenderSelectionAt: Date | null;
  firstDealAt: Date | null;
  firstSubmissionTrackedAt: Date | null;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function isOnboardingChecklistComplete(s: OnboardingChecklistState): boolean {
  return (
    s.firstLeadAt != null &&
    s.firstLenderSelectionAt != null &&
    s.firstDealAt != null &&
    s.firstSubmissionTrackedAt != null
  );
}

export function GettingStartedChecklist({ state }: { state: OnboardingChecklistState }) {
  const items: {
    done: boolean;
    title: string;
    body: string;
    hint?: string;
    href?: string;
    cta?: string;
  }[] = [
    {
      done: state.firstLeadAt != null,
      title: "First lead created",
      body: "Add a lead in the CRM or from your public form.",
      hint: "Leads",
      href: "/leads/new",
      cta: "Create lead",
    },
    {
      done: state.firstLenderSelectionAt != null,
      title: "First lender match / selection",
      body: "Open a lead, review lender fit, add lenders to a deal.",
      hint: "Leads → open a lead",
      href: "/leads",
      cta: "Go to leads",
    },
    {
      done: state.firstDealAt != null,
      title: "First deal created",
      body: "Create a deal and link a lead.",
      hint: "Deals",
      href: "/deals/new",
      cta: "Create deal",
    },
    {
      done: state.firstSubmissionTrackedAt != null,
      title: "First lender submission tracked",
      body: "On a deal, update lender status as applications progress.",
      hint: "Deals → open a deal",
      href: "/deals",
      cta: "Go to deals",
    },
  ];

  return (
    <ol className="space-y-5 text-sm">
      {items.map((item, i) => (
        <li
          key={item.title}
          className={`flex gap-4 rounded-xl border px-4 py-4 sm:px-5 ${
            item.done ? "border-emerald-200/80 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              item.done
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
            aria-hidden
          >
            {item.done ? <CheckIcon className="h-4 w-4" /> : <span className="tabular-nums">{i + 1}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${item.done ? "text-emerald-950" : "text-slate-900"}`}>{item.title}</p>
            <p className={`mt-0.5 ${item.done ? "text-emerald-900/80" : "text-slate-600"}`}>{item.body}</p>
            {!item.done && item.href ? (
              <p className="mt-2">
                <Link href={item.href} className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline">
                  {item.cta ?? "Continue"}
                </Link>
                {item.hint ? (
                  <span className="ml-2 text-xs text-slate-500">
                    · {item.hint}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
