import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-600">
          Access your workspace to continue.
        </p>

        <SignIn path="/sign-in" routing="path" />

        <p className="mt-4 text-sm text-slate-600">
          New here?{" "}
          <Link href="/sign-up" className="font-medium text-slate-900 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

