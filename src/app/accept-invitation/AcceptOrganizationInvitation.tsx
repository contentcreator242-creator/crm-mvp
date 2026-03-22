"use client";

/* Legacy hooks: org-invite ticket flow uses `signIn.create({ strategy: 'ticket' })` + `setActive`. Clerk v7 default hooks are signal-based (`signIn.ticket` + `finalize`). */
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";

/**
 * Single-flight for ticket sign-in: Strict Mode runs the effect twice; skip the second while the first request runs.
 */
let organizationInviteSignInInFlightToken: string | null = null;

function clerkErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "errors" in e) {
    const errs = (e as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;
    const first = errs?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

/**
 * Handles org invite links when `redirectUrl` points here.
 * @see https://clerk.com/docs/organizations/accept-organization-invitations
 */
export function AcceptOrganizationInvitation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("__clerk_ticket");
  const accountStatus = searchParams.get("__clerk_status");

  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (accountStatus !== "complete" || !token) return;
    router.replace("/dashboard");
    router.refresh();
  }, [accountStatus, token, router]);

  React.useEffect(() => {
    if (accountStatus !== "sign_in" || !token || !signInLoaded || !signIn || !setActiveSignIn) return;
    if (organizationInviteSignInInFlightToken === token) return;
    organizationInviteSignInInFlightToken = token;

    setError(null);

    void (async () => {
      try {
        const attempt = await signIn.create({
          strategy: "ticket",
          ticket: token,
        });
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActiveSignIn({ session: attempt.createdSessionId });
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        setError("Could not complete sign-in from this invitation. Try signing in with your email.");
        console.error("Clerk sign-in attempt (ticket):", attempt);
      } catch (e) {
        setError(clerkErrorMessage(e));
      } finally {
        if (organizationInviteSignInInFlightToken === token) {
          organizationInviteSignInInFlightToken = null;
        }
      }
    })();
  }, [accountStatus, token, signInLoaded, signIn, setActiveSignIn, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp || !setActiveSignUp || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await signUp.create({
        strategy: "ticket",
        ticket: token,
        password,
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActiveSignUp({ session: attempt.createdSessionId });
        router.replace("/dashboard");
        router.refresh();
      } else {
        setError("Additional verification may be required. Try again or contact support.");
        console.error("Clerk sign-up attempt (ticket):", attempt);
      }
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Invitation link invalid</h1>
        <p className="mb-4 text-sm text-slate-600">
          This page is used to accept a workspace invitation. Open the link from your invitation email, or ask an admin
          to send a new invite.
        </p>
        <Link href="/sign-in" className="text-sm font-medium text-slate-900 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!accountStatus) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Invitation incomplete</h1>
        <p className="text-sm text-slate-600">
          This invitation link is missing required parameters. Use the link from your latest invitation email.
        </p>
      </div>
    );
  }

  if (accountStatus === "complete") {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Welcome</h1>
        <p className="text-sm text-slate-600">Taking you to your workspace…</p>
      </div>
    );
  }

  if (accountStatus === "sign_in") {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Accept invitation</h1>
        {error ? (
          <>
            <p className="mb-4 text-sm text-red-600">{error}</p>
            <Link href="/sign-in" className="text-sm font-medium text-slate-900 underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-600">Signing you in…</p>
        )}
      </div>
    );
  }

  if (accountStatus === "sign_up") {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mb-6 text-sm text-slate-600">
          Finish setting up your password to join this workspace. If your Clerk settings require first and last name,
          fill those in too.
        </p>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="invite-first" className="mb-1 block text-xs font-medium text-slate-700">
              First name <span className="font-normal text-slate-500">(if required)</span>
            </label>
            <input
              id="invite-first"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="invite-last" className="mb-1 block text-xs font-medium text-slate-700">
              Last name <span className="font-normal text-slate-500">(if required)</span>
            </label>
            <input
              id="invite-last"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="invite-password" className="mb-1 block text-xs font-medium text-slate-700">
              Password
            </label>
            <input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting || !signUpLoaded}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Join workspace"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Invitation</h1>
      <p className="mb-4 text-sm text-slate-600">We couldn&apos;t process this invitation ({accountStatus}).</p>
      <Link href="/sign-in" className="text-sm font-medium text-slate-900 underline">
        Sign in
      </Link>
    </div>
  );
}

export function AcceptOrganizationInvitationChrome({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}
