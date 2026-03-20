"use client";

import { useFormStatus } from "react-dom";

function SubmitDelete() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-semibold text-red-700 underline decoration-red-200 underline-offset-2 hover:text-red-900 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteEmailTemplateButton({
  action,
  templateId,
}: {
  action: (formData: FormData) => Promise<void>;
  templateId: string;
}) {
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("Delete this template?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="templateId" value={templateId} />
      <SubmitDelete />
    </form>
  );
}
