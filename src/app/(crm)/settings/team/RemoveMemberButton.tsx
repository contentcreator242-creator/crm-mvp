"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveMemberButton({
  userId,
  label,
  disabled,
}: {
  userId: string;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${label} from this workspace?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/members/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        window.alert(j.error?.message ?? "Could not remove member");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={disabled || loading}
      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {loading ? "Removing…" : "Remove"}
    </button>
  );
}
