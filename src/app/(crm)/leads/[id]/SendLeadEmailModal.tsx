"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  LEAD_EMAIL_TEMPLATES,
  applyLeadEmailTemplatePlaceholders,
  type LeadEmailTemplateId,
} from "@/lib/email/leadEmailTemplates";
import { sendLeadEmailAction, type SendLeadEmailState } from "./sendLeadEmailAction";

/** Workspace templates from DB (serialized on the server for this org only). */
export type ComposerCustomTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

type SendLeadEmailModalProps = {
  leadId: string;
  leadEmail: string | null;
  firstName: string;
  /** Resolved Reply-To (member setting or env fallback) for display only */
  replyToHint: string | null;
  customTemplates: ComposerCustomTemplate[];
};

type SendLeadEmailModalInnerProps = {
  leadId: string;
  leadEmail: string;
  firstName: string;
  replyToHint: string | null;
  customTemplates: ComposerCustomTemplate[];
  onClose: () => void;
};

export function SendLeadEmailModal({
  leadId,
  leadEmail,
  firstName,
  replyToHint,
  customTemplates,
}: SendLeadEmailModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={!leadEmail?.trim()}
        title={
          !leadEmail?.trim()
            ? "Add an email address on the lead before sending."
            : "Send a one-to-one email via Resend"
        }
        onClick={() => setOpen(true)}
      >
        Send Email
      </button>
      {open && leadEmail?.trim() ? (
        <SendLeadEmailModalInner
          leadId={leadId}
          leadEmail={leadEmail.trim()}
          firstName={firstName}
          replyToHint={replyToHint}
          customTemplates={customTemplates}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SendLeadEmailModalInner({
  leadId,
  leadEmail,
  firstName,
  replyToHint,
  customTemplates,
  onClose,
}: SendLeadEmailModalInnerProps) {
  const [state, formAction, pending] = useActionState(sendLeadEmailAction, null as SendLeadEmailState);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (state?.ok) {
      const t = window.setTimeout(() => onClose(), 1800);
      return () => window.clearTimeout(t);
    }
  }, [state, onClose]);

  function applyBuiltinTemplate(id: LeadEmailTemplateId) {
    const t = LEAD_EMAIL_TEMPLATES.find((x) => x.id === id);
    if (!t || !subjectRef.current || !bodyRef.current) return;
    subjectRef.current.value = applyLeadEmailTemplatePlaceholders(t.subject, firstName);
    bodyRef.current.value = applyLeadEmailTemplatePlaceholders(t.body, firstName);
  }

  function applyCustomTemplate(id: string) {
    const t = customTemplates.find((x) => x.id === id);
    if (!t || !subjectRef.current || !bodyRef.current) return;
    subjectRef.current.value = applyLeadEmailTemplatePlaceholders(t.subject, firstName);
    bodyRef.current.value = applyLeadEmailTemplatePlaceholders(t.body, firstName);
  }

  function onTemplateSelect(value: string) {
    if (!value) return;
    if (value.startsWith("builtin:")) {
      applyBuiltinTemplate(value.slice("builtin:".length) as LeadEmailTemplateId);
      return;
    }
    if (value.startsWith("custom:")) {
      applyCustomTemplate(value.slice("custom:".length));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-email-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="send-email-title" className="text-lg font-semibold text-slate-900">
              Send email
            </h2>
            <p className="mt-1 text-sm text-slate-600">One-to-one message via Resend (not a campaign).</p>
            {replyToHint ? (
              <p className="mt-2 text-xs text-slate-600">
                Replies will go to:{" "}
                <span className="font-mono font-medium text-slate-800">{replyToHint}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                No Reply-To set — add your address in{" "}
                <a href="/settings/email" className="font-semibold underline underline-offset-2">
                  Settings → Email
                </a>{" "}
                or set <code className="rounded bg-amber-100 px-1">EMAIL_REPLY_TO</code> on the server.
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {state?.ok === false ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        {state?.ok ? (
          <div
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            {state.message}
          </div>
        ) : null}

        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="leadId" value={leadId} />

          <div>
            <label htmlFor="email-template" className="crm-field-label">
              Template
            </label>
            <select
              id="email-template"
              className="adm-input mt-1"
              defaultValue=""
              onChange={(e) => onTemplateSelect(e.target.value)}
            >
              <option value="">Choose a template (optional)</option>
              {customTemplates.length > 0 ? (
                <optgroup label="Workspace">
                  {customTemplates.map((t) => (
                    <option key={t.id} value={`custom:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Built-in">
                {LEAD_EMAIL_TEMPLATES.map((t) => (
                  <option key={t.id} value={`builtin:${t.id}`}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {customTemplates.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Add templates in{" "}
                <a href="/settings/email-templates" className="font-semibold text-slate-800 underline">
                  Settings → Email templates
                </a>
                .
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email-recipient" className="crm-field-label">
              Recipient
            </label>
            <input
              id="email-recipient"
              name="recipient"
              type="email"
              required
              readOnly
              defaultValue={leadEmail}
              className="adm-input mt-1 read-only:bg-slate-50"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-500">Must match this lead’s email.</p>
          </div>

          <div>
            <label htmlFor="email-subject" className="crm-field-label">
              Subject
            </label>
            <input
              ref={subjectRef}
              id="email-subject"
              name="subject"
              type="text"
              required
              maxLength={200}
              className="adm-input mt-1"
              placeholder="Subject line"
            />
          </div>

          <div>
            <label htmlFor="email-body" className="crm-field-label">
              Message
            </label>
            <textarea
              ref={bodyRef}
              id="email-body"
              name="body"
              required
              rows={10}
              className="adm-input mt-1 min-h-[160px]"
              placeholder="Write your message…"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary text-sm" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="adm-btn-primary text-sm disabled:opacity-60" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
