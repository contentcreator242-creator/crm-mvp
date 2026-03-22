"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LeadCoreFormDefaults } from "@/lib/leads/leadCoreFields";
import { LeadCoreFormFields } from "@/components/leads/LeadCoreFormFields";

export type LeadEditFormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function LeadEditForm({
  leadId,
  defaults,
  action,
}: {
  leadId: string;
  defaults: LeadCoreFormDefaults;
  action: (state: LeadEditFormState, formData: FormData) => Promise<LeadEditFormState>;
}) {
  const [state, formAction] = useActionState<LeadEditFormState, FormData>(action, {
    ok: false,
  });

  const err = state.errors ?? {};

  return (
    <form
      key={leadId}
      action={formAction}
      className="space-y-10 rounded-2xl border border-slate-200/90 bg-white p-7 shadow-adm sm:p-8"
    >
      <input type="hidden" name="leadId" value={leadId} />

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

      <LeadCoreFormFields err={err} defaults={defaults} />

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
