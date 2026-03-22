"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevokeInvitationButton({ invitationId, email }: { invitationId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function revoke() {
    if (!window.confirm(`Revoke invitation to ${email}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/organization/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        window.alert(j.error?.message ?? "Could not revoke invitation");
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
      onClick={revoke}
      disabled={loading}
      className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
    >
      {loading ? "Revoking…" : "Revoke"}
    </button>
  );
}
