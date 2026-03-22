"use client";

import { useState } from "react";

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seatNotice, setSeatNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setSeatNotice(null);
    try {
      const res = await fetch("/api/organization/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: email.trim(), role: "org:member" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        seatNotice?: string | null;
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Invite failed");
        return;
      }
      setEmail("");
      setMessage("Invitation sent.");
      if (data.seatNotice) setSeatNotice(data.seatNotice);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="inviteEmail" className="crm-field-label">
          Email address
        </label>
        <input
          id="inviteEmail"
          type="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="adm-input mt-1"
          placeholder="colleague@company.com"
          autoComplete="email"
        />
      </div>
      {seatNotice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{seatNotice}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {message}
        </p>
      ) : null}
      <button type="submit" className="btn-primary text-sm" disabled={loading}>
        {loading ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
