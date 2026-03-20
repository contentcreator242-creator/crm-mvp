import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Create account</h1>
        <p className="mb-6 text-sm text-slate-600">
          Start your CRM workspace in minutes.
        </p>

        <SignUp path="/sign-up" routing="path" />

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

