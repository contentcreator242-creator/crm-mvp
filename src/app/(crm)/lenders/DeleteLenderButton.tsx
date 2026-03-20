"use client";

import { useFormStatus } from "react-dom";

function SubmitDelete({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-danger text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

export type DeleteLenderButtonProps =
  | { action: () => Promise<void>; submitLabel?: string }
  | {
      action: (formData: FormData) => Promise<void>;
      lenderId: string;
      submitLabel?: string;
      /** Where to send the user after delete (passed as hidden `redirectTo`). */
      redirectAfterDelete?: "/lenders" | "/dashboard";
    };

export function DeleteLenderButton(props: DeleteLenderButtonProps) {
  const label = props.submitLabel ?? "Delete lender";
  const redirectAfterDelete =
    "lenderId" in props ? props.redirectAfterDelete : undefined;

  return (
    <form
      className="inline-flex shrink-0 items-center"
      action={props.action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this lender? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      {"lenderId" in props ? <input type="hidden" name="lenderId" value={props.lenderId} /> : null}
      {redirectAfterDelete ? (
        <input type="hidden" name="redirectTo" value={redirectAfterDelete} />
      ) : null}
      <SubmitDelete label={label} />
    </form>
  );
}
