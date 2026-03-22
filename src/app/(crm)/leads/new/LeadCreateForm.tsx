"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LeadCoreFormFields } from "@/components/leads/LeadCoreFormFields";

export type LeadCreateFormState = {
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
      {pending ? "Creating..." : "Create lead"}
    </button>
  );
}

export function LeadCreateForm({
  action,
}: {
  action: (state: LeadCreateFormState, formData: FormData) => Promise<LeadCreateFormState>;
}) {
  const [state, formAction] = useActionState<LeadCreateFormState, FormData>(action, {
    ok: false,
  });

  const err = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-10 rounded-2xl border border-slate-200/90 bg-white p-7 shadow-adm sm:p-8">
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

      <LeadCoreFormFields err={err} />

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
