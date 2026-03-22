"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeadEmbedCopyButton } from "@/app/(crm)/settings/integrations/LeadEmbedCopyButton";
import { completeOnboardingAction, saveOnboardingStep1Action } from "./onboardingActions";

type Props = {
  initialOrganizationName: string;
  initialReplyEmail: string;
  embedPath: string;
  embedUrl: string;
  iframeCode: string;
};

export function OnboardingWizard({
  initialOrganizationName,
  initialReplyEmail,
  embedPath,
  embedUrl,
  iframeCode,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onStep1Submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep1Action(formData);
      if (result.ok) {
        setStep(2);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onContinueFromStep2() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (result.ok) {
        setStep(3);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Setup</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome — let&apos;s finish your workspace</h1>
        <p className="mt-2 text-sm text-slate-600">Three quick steps. You can change everything later in Settings.</p>
      </header>

      <ol className="flex justify-center gap-2 text-xs font-semibold text-slate-500">
        <li className={step === 1 ? "text-slate-900" : ""}>1 · Workspace</li>
        <li aria-hidden>·</li>
        <li className={step === 2 ? "text-slate-900" : ""}>2 · Lead capture</li>
        <li aria-hidden>·</li>
        <li className={step === 3 ? "text-slate-900" : ""}>3 · Done</li>
      </ol>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <form onSubmit={onStep1Submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="onbOrganizationName" className="crm-field-label">
              Organization name
            </label>
            <input
              id="onbOrganizationName"
              name="organizationName"
              required
              maxLength={120}
              defaultValue={initialOrganizationName}
              className="adm-input mt-1"
              placeholder="Shown in the app, embed form, and emails"
            />
          </div>

          <div>
            <label htmlFor="onbReply" className="crm-field-label">
              Reply-to email (optional)
            </label>
            <input
              id="onbReply"
              name="replyToEmail"
              type="email"
              defaultValue={initialReplyEmail}
              className="adm-input mt-1"
              placeholder="Replies when you email leads from the CRM"
            />
            <p className="mt-1 text-xs text-slate-500">Used for outbound lead emails from this workspace.</p>
          </div>

          <button type="submit" disabled={pending} className="adm-btn-primary w-full text-sm sm:w-auto">
            {pending ? "Saving…" : "Continue"}
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Lead capture</h2>
            <p className="mt-1 text-sm text-slate-600">
              Preview your public form and copy the iframe code for your website.
            </p>
          </div>

          <div>
            <p className="crm-field-label">Preview</p>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <iframe title="Lead form preview" src={embedPath} className="h-[420px] w-full bg-white" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <Link href={embedPath} target="_blank" rel="noreferrer" className="font-semibold underline">
                Open preview in new tab
              </Link>
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="crm-field-label mb-0">Embed iframe code</p>
              <LeadEmbedCopyButton text={iframeCode} />
            </div>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
              {iframeCode}
            </pre>
          </div>

          <div>
            <p className="crm-field-label">Share link</p>
            <p className="mt-1 break-all rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900">
              {embedUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary text-sm">
              Back
            </button>
            <button type="button" onClick={onContinueFromStep2} disabled={pending} className="adm-btn-primary text-sm">
              {pending ? "Saving…" : "Finish setup"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-emerald-950">You&apos;re all set</h2>
          <p className="text-sm text-emerald-900/90">
            Your workspace is ready. Open the dashboard to see metrics, or jump to leads to manage your pipeline.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/dashboard" className="adm-btn-primary inline-flex justify-center text-sm">
              Go to dashboard
            </Link>
            <Link href="/leads" className="btn-secondary inline-flex justify-center text-sm">
              View leads
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
