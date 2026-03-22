"use client";

import type { ReactNode } from "react";
import type { LeadCoreFormDefaults } from "@/lib/leads/leadCoreFields";
import { LEAD_WORKFLOW_OPTIONS } from "@/lib/leads/leadWorkflowStatus";

export type { LeadCoreFormDefaults };

function fieldClass(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 ${
    hasError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200/80" : "border-slate-200"
  }`;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-slate-100 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  );
}

export function LeadCoreFormFields({
  err,
  defaults,
}: {
  err: Partial<Record<string, string>>;
  defaults?: LeadCoreFormDefaults;
}) {
  const d = defaults ?? {};

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <SectionTitle>Contact details</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              First name *
            </label>
            <input
              name="firstName"
              required
              defaultValue={d.firstName ?? ""}
              className={fieldClass(Boolean(err.firstName))}
              autoComplete="given-name"
            />
            {err.firstName ? <p className="mt-1 text-xs text-rose-600">{err.firstName}</p> : null}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Last name</label>
            <input
              name="lastName"
              defaultValue={d.lastName ?? ""}
              className={fieldClass(Boolean(err.lastName))}
              autoComplete="family-name"
            />
            {err.lastName ? <p className="mt-1 text-xs text-rose-600">{err.lastName}</p> : null}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Email *</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={d.email ?? ""}
            className={fieldClass(Boolean(err.email))}
            autoComplete="email"
          />
          {err.email ? <p className="mt-1 text-xs text-rose-600">{err.email}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Phone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={d.phone ?? ""}
            className={fieldClass(Boolean(err.phone))}
            autoComplete="tel"
          />
          {err.phone ? <p className="mt-1 text-xs text-rose-600">{err.phone}</p> : null}
        </div>
      </div>

      <div className="space-y-5">
        <SectionTitle>Business details</SectionTitle>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Company name</label>
          <input
            name="companyName"
            defaultValue={d.companyName ?? ""}
            className={fieldClass(Boolean(err.companyName))}
            autoComplete="organization"
          />
          {err.companyName ? <p className="mt-1 text-xs text-rose-600">{err.companyName}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Business type</label>
          <input
            name="businessType"
            placeholder="e.g. Retail, hospitality, professional services"
            defaultValue={d.businessType ?? ""}
            className={fieldClass(Boolean(err.businessType))}
          />
          {err.businessType ? <p className="mt-1 text-xs text-rose-600">{err.businessType}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Time trading (months)
          </label>
          <input
            name="timeTradingMonths"
            inputMode="numeric"
            placeholder="e.g. 24"
            defaultValue={d.timeTradingMonths ?? ""}
            className={fieldClass(Boolean(err.timeTradingMonths))}
          />
          <p className="mt-1 text-[11px] text-slate-500">Whole months trading.</p>
          {err.timeTradingMonths ? <p className="mt-1 text-xs text-rose-600">{err.timeTradingMonths}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Credit issues</label>
          <select
            name="creditIssues"
            className={fieldClass(Boolean(err.creditIssues))}
            defaultValue={d.creditIssues ?? ""}
          >
            <option value="">Not specified</option>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
          {err.creditIssues ? <p className="mt-1 text-xs text-rose-600">{err.creditIssues}</p> : null}
        </div>
      </div>

      <div className="space-y-5">
        <SectionTitle>Funding details</SectionTitle>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Requested amount
          </label>
          <input
            name="requestedAmount"
            inputMode="numeric"
            placeholder="e.g. 50000"
            defaultValue={d.requestedAmount ?? ""}
            className={fieldClass(Boolean(err.requestedAmount))}
          />
          <p className="mt-1 text-[11px] text-slate-500">Whole currency units.</p>
          {err.requestedAmount ? <p className="mt-1 text-xs text-rose-600">{err.requestedAmount}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Annual revenue</label>
          <input
            name="annualRevenue"
            inputMode="numeric"
            placeholder="e.g. 250000"
            defaultValue={d.annualRevenue ?? ""}
            className={fieldClass(Boolean(err.annualRevenue))}
          />
          <p className="mt-1 text-[11px] text-slate-500">Optional.</p>
          {err.annualRevenue ? <p className="mt-1 text-xs text-rose-600">{err.annualRevenue}</p> : null}
        </div>
      </div>

      <div className="space-y-5">
        <SectionTitle>Pipeline</SectionTitle>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Status</label>
          <select
            name="status"
            defaultValue={d.status ?? "new"}
            className={fieldClass(Boolean(err.status))}
          >
            {LEAD_WORKFLOW_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {err.status ? <p className="mt-1 text-xs text-rose-600">{err.status}</p> : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Notes</label>
          <textarea name="notes" rows={5} defaultValue={d.notes ?? ""} className={fieldClass(Boolean(err.notes))} />
          {err.notes ? <p className="mt-1 text-xs text-rose-600">{err.notes}</p> : null}
        </div>
      </div>
    </div>
  );
}
