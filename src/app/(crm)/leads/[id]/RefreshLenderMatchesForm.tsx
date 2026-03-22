"use client";

import { useFormStatus } from "react-dom";

function SubmitRefresh({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-secondary-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh matches"}
    </button>
  );
}

export function RefreshLenderMatchesForm({
  leadId,
  action,
  disabled,
  disabledReason,
}: {
  leadId: string;
  action: (formData: FormData) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="leadId" value={leadId} />
        <SubmitRefresh disabled={Boolean(disabled)} />
      </form>
      {disabled && disabledReason ? (
        <p className="max-w-[220px] text-right text-[10px] text-slate-500">{disabledReason}</p>
      ) : null}
    </div>
  );
}
