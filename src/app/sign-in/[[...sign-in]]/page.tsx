import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";
import { sanitizeInternalPath } from "@/lib/billing/sanitizeRedirect";

type SignInPageProps = {
  searchParams?: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : {};
  const afterSignIn = sanitizeInternalPath(params.redirect_url);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mb-6 text-sm text-slate-600">Access your workspace to continue.</p>

          <SignIn
            path="/sign-in"
            routing="path"
            {...(afterSignIn ? { forceRedirectUrl: afterSignIn } : {})}
          />

          <p className="mt-4 text-sm text-slate-600">
            New here?{" "}
            <Link href="/sign-up" className="font-medium text-slate-900 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}

