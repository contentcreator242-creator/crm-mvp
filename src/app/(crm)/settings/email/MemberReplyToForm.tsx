"use client";

import { useActionState } from "react";
import {
  saveMemberReplyToEmailAction,
  type SaveMemberReplyToEmailState,
} from "./saveMemberReplyToEmailAction";

type Props = {
  defaultReplyTo: string;
  clerkEmailHint: string | null;
  envFallbackLabel: string | null;
};

export function MemberReplyToForm({
  defaultReplyTo,
  clerkEmailHint,
  envFallbackLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveMemberReplyToEmailAction,
    null as SaveMemberReplyToEmailState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="replyToEmail" className="crm-field-label">
          Your reply-to address
        </label>
        <input
          id="replyToEmail"
          name="replyToEmail"
          type="email"
          defaultValue={defaultReplyTo}
          placeholder={clerkEmailHint ?? "you@yourcompany.com"}
          className="adm-input mt-1 max-w-md"
          autoComplete="email"
        />
        <p className="mt-2 text-xs text-slate-600">
          When you email a lead from the CRM, their mail client will reply to this address (usually your work
          inbox). Leave empty to use the workspace fallback
          {envFallbackLabel ? (
            <>
              : <span className="font-mono text-slate-800">{envFallbackLabel}</span>
            </>
          ) : (
            " (set <code className=\"rounded bg-slate-100 px-1\">EMAIL_REPLY_TO</code> in server env if needed)"
          )}
          .
        </p>
      </div>

      {state?.ok === false ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {state.error}
        </div>
      ) : null}

      {state?.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="adm-btn-primary text-sm disabled:opacity-60" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <p className="self-center text-xs text-slate-500">
          Clear the field and save to remove your personal reply-to.
        </p>
      </div>
    </form>
  );
}
