"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  isRecaptchaSiteKeyConfigured,
  isRecaptchaV3,
  needsRecaptchaV2Checkbox,
  RECAPTCHA_SITE_KEY,
} from "@/components/embed/recaptchaConfig";
import { RecaptchaCheckbox } from "@/components/embed/RecaptchaCheckbox";
import { ensureRecaptchaV3Ready, executeRecaptchaV3 } from "@/components/embed/recaptchaV3Client";
import { normalizeLeadCaptureKey } from "@/lib/embed/leadCaptureKey";
import {
  type OrganizationBrandingFields,
  darkerHex,
  effectivePrimaryHex,
} from "@/lib/settings/organizationBranding";

const STEP_LABELS = ["Personal details", "Business details", "Funding request"] as const;

function validatePanel(form: HTMLFormElement, panel: number): boolean {
  const panelEl = form.querySelector(`[data-panel="${panel}"]`);
  if (!panelEl) return false;
  const controls = panelEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input:not([type='hidden']), select, textarea",
  );
  for (const control of controls) {
    if (!control.checkValidity()) {
      control.focus();
      control.reportValidity();
      return false;
    }
  }
  return true;
}

function FormInner({ branding }: { branding: OrganizationBrandingFields | null }) {
  const searchParams = useSearchParams();
  const key = useMemo(
    () => normalizeLeadCaptureKey(searchParams.get("key") ?? ""),
    [searchParams],
  );
  const primary = effectivePrimaryHex(branding?.primaryColorHex);
  const primaryHover = darkerHex(primary);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string>("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaMountKey, setRecaptchaMountKey] = useState(0);

  useEffect(() => {
    if (step !== 3) setRecaptchaToken(null);
  }, [step]);

  useEffect(() => {
    if (step === 3 && isRecaptchaV3()) {
      void ensureRecaptchaV3Ready(RECAPTCHA_SITE_KEY).catch(() => {});
    }
  }, [step]);

  /** Only called from the explicit "Get Matches" control — no native form submit (avoids Enter / mobile implicit submit). */
  async function runLeadSubmit() {
    const form = formRef.current;
    if (!form || step !== 3) return;

    if (!key) {
      setStatus("err");
      setMessage("Missing ?key= (organization lead capture key).");
      return;
    }

    let recaptchaTokenForApi: string | null = null;
    if (isRecaptchaV3()) {
      try {
        recaptchaTokenForApi = await executeRecaptchaV3("lead_submit");
      } catch {
        setStatus("err");
        setMessage("Verification failed. Please try again.");
        return;
      }
    } else if (isRecaptchaSiteKeyConfigured()) {
      if (!recaptchaToken?.trim()) {
        setStatus("err");
        setMessage("Please complete the verification check.");
        return;
      }
      recaptchaTokenForApi = recaptchaToken;
    }

    const fd = new FormData(form);

    const creditRaw = fd.get("creditIssues");
    const creditIssues =
      creditRaw === "yes" ? true : creditRaw === "no" ? false : null;

    const num = (name: string) => {
      const v = String(fd.get(name) ?? "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.floor(n) : null;
    };

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationPublicKey: key,
          firstName: String(fd.get("firstName") ?? "").trim(),
          lastName: String(fd.get("lastName") ?? "").trim() || null,
          email: String(fd.get("email") ?? "").trim(),
          phone: String(fd.get("phone") ?? "").trim() || null,
          companyName: String(fd.get("companyName") ?? "").trim() || null,
          requestedAmount: num("requestedAmount"),
          annualRevenue: num("annualRevenue"),
          timeTradingMonths: num("timeTradingMonths"),
          creditIssues,
          businessType: String(fd.get("businessType") ?? "").trim() || null,
          notes: String(fd.get("notes") ?? "").trim() || null,
          leadSource: String(fd.get("leadSource") ?? "").trim() || "embed",
          turnstileToken:
            typeof window !== "undefined"
              ? (window as unknown as { turnstileToken?: string }).turnstileToken ??
                null
              : null,
          recaptchaToken: recaptchaTokenForApi?.trim() || null,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!res.ok) {
        setStatus("err");
        setMessage(body.error?.message ?? "Submission failed.");
        return;
      }

      setStatus("ok");
      setMessage("Thanks — we received your details. We'll be in touch soon.");
      form.reset();
      setRecaptchaToken(null);
      setRecaptchaMountKey((k) => k + 1);
      setStep(1);
    } catch {
      setStatus("err");
      setMessage("Network error.");
    }
  }

  function goNext() {
    const form = formRef.current;
    if (!form) return;
    if (!validatePanel(form, step)) return;
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/90";
  const labelClass = "block text-sm font-semibold text-slate-700";

  if (!key) {
    return (
      <div className="text-sm leading-relaxed text-slate-700">
        <p className="mt-0">
          This form only works when you open it with your workspace&apos;s public key in the URL.
        </p>
        <p className="mb-0">
          <strong>What to do:</strong> In the CRM, open <strong>Dashboard</strong> → copy{" "}
          <strong>Embed / share link</strong> or
          <strong> Workspace key only</strong>, then use{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            /embed/lead?key=YOUR_KEY_HERE
          </code>
          . Example:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            /embed/lead?key=550e8400-e29b-41d4-a716-446655440000
          </code>
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col"
    >
      {message ? (
        <p
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            status === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : status === "err"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {message}
        </p>
      ) : null}

      {/* Header (inside card — page supplies outer shell) */}
      <div className="mb-5 border-b border-slate-100 pb-5">
        {branding?.logoUrl ? (
          <div className="mb-4 flex justify-center">
            <img
              src={branding.logoUrl}
              alt=""
              className="max-h-16 max-w-[220px] object-contain"
            />
          </div>
        ) : null}
        <h1 className="text-center text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-left">
          {branding ? branding.displayName : "Get matched with business lenders"}
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-600 sm:text-left">
          Tell us about your business and we&apos;ll match you with suitable lenders — no obligation
        </p>
      </div>

      <fieldset disabled={status === "loading"} className="min-h-0 flex-1 border-0 p-0">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step {step} of 3
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{STEP_LABELS[step - 1]}</p>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: n <= step ? primary : "#e2e8f0",
                }}
              />
            ))}
          </div>
        </div>

        {/* Consistent step body height — keeps card stable while switching steps */}
        <div className="flex min-h-[280px] flex-col sm:min-h-[300px]">
          {/* Step 1 — Personal details */}
          <div data-panel="1" className={step === 1 ? "flex flex-1 flex-col gap-4" : "hidden"}>
            <div>
              <label className={labelClass}>
                First name *
                <input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Last name
                <input name="lastName" autoComplete="family-name" className={inputClass} />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Email *
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Phone
                <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
              </label>
            </div>
          </div>

          {/* Step 2 — Business details */}
          <div data-panel="2" className={step === 2 ? "flex flex-1 flex-col gap-4" : "hidden"}>
            <div>
              <label className={labelClass}>
                Company
                <input name="companyName" autoComplete="organization" className={inputClass} />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Industry
                <input
                  name="businessType"
                  placeholder="e.g. retail, construction"
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Time trading (months)
                <input
                  name="timeTradingMonths"
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Annual revenue (GBP)
                <input
                  name="annualRevenue"
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {/* Step 3 — Funding request */}
          <div data-panel="3" className={step === 3 ? "flex flex-1 flex-col gap-4" : "hidden"}>
            <div>
              <label className={labelClass}>
                Requested amount (GBP, whole pounds)
                <input
                  name="requestedAmount"
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Credit issues
                <select name="creditIssues" defaultValue="" className={`${inputClass} cursor-pointer`}>
                  <option value="">Unknown</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>
            <div>
              <label className={labelClass}>
                Notes <span className="font-normal text-slate-500">(optional)</span>
                <textarea name="notes" rows={4} className={`${inputClass} resize-y`} />
              </label>
            </div>
            <div>
              <label className={labelClass}>
                How did you hear about us? <span className="font-normal text-slate-500">(optional)</span>
                <input name="leadSource" className={inputClass} />
              </label>
            </div>
          </div>
        </div>

        {step === 3 && needsRecaptchaV2Checkbox() ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-4">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-left">
              Verification
            </p>
            <RecaptchaCheckbox key={recaptchaMountKey} onChange={setRecaptchaToken} />
          </div>
        ) : null}

        {step === 3 && isRecaptchaV3() ? (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500 sm:text-left">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              href="https://policies.google.com/privacy"
              className="font-medium text-slate-600 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              className="font-medium text-slate-600 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Terms of Service
            </a>{" "}
            apply.
          </p>
        ) : null}

        <div
          className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch ${step > 1 ? "sm:justify-between" : ""}`}
        >
          <div className="flex w-full sm:w-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[120px]"
              >
                Back
              </button>
            ) : null}
          </div>
          <div className={`flex w-full ${step > 1 ? "sm:w-auto sm:justify-end" : ""}`}>
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-95 sm:min-w-[160px]"
                style={{ backgroundColor: primary, boxShadow: `0 4px 14px ${primary}40` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = primary;
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-md transition enabled:cursor-pointer disabled:opacity-60 sm:min-w-[200px]"
                style={{ backgroundColor: primary, boxShadow: `0 4px 14px ${primary}40` }}
                disabled={status === "loading"}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = primary;
                }}
                onClick={() => void runLeadSubmit()}
              >
                {status === "loading" ? "Getting matches…" : "Get Matches"}
              </button>
            )}
          </div>
        </div>

        {step === 3 ? (
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-500 sm:text-left">
            We are a broker, not a lender. We connect you with multiple funding providers.
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}

export default function EmbedLeadForm({
  branding,
}: {
  branding: OrganizationBrandingFields | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading form…
        </div>
      }
    >
      <FormInner branding={branding} />
    </Suspense>
  );
}
