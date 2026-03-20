"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LEAD_WORKFLOW_OPTIONS } from "@/lib/leads/leadWorkflowStatus";

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<"firstName" | "email", string>>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating..." : "Create Lead"}
    </button>
  );
}

export function LeadCreateForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    ok: false,
  });

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
      {state.message ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            First Name *
          </label>
          <input
            name="firstName"
            required
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring ${
              state.errors?.firstName ? "border-rose-400" : "border-slate-300"
            }`}
          />
          {state.errors?.firstName ? (
            <p className="mt-1 text-xs text-rose-600">{state.errors.firstName}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Last Name
          </label>
          <input
            name="lastName"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Email *
          </label>
          <input
            name="email"
            type="email"
            required
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring ${
              state.errors?.email ? "border-rose-400" : "border-slate-300"
            }`}
          />
          {state.errors?.email ? (
            <p className="mt-1 text-xs text-rose-600">{state.errors.email}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Phone
          </label>
          <input
            name="phone"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Company Name
          </label>
          <input
            name="companyName"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Status
          </label>
          <select
            name="status"
            defaultValue="new"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring"
          >
            {LEAD_WORKFLOW_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
          Notes
        </label>
        <textarea
          name="notes"
          rows={7}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 focus:ring"
        />
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}

