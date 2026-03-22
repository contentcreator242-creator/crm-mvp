import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";
import { sanitizeInternalPath } from "@/lib/billing/sanitizeRedirect";

type SignUpPageProps = {
  searchParams?: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = searchParams ? await searchParams : {};
  const afterSignUp = sanitizeInternalPath(params.redirect_url);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Create account</h1>
          <p className="mb-6 text-sm text-slate-600">Start your CRM workspace in minutes.</p>

          <SignUp
            path="/sign-up"
            routing="path"
            {...(afterSignUp ? { forceRedirectUrl: afterSignUp } : {})}
          />

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-slate-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}

