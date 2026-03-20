import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">CRM MVP</h1>
      <p className="mt-3 text-lg text-slate-600">
        Workspace for leads, deals, lenders, and tasks — scoped to your Clerk organization.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Create account
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        After you sign in, you&apos;ll go to the dashboard. Embed lead capture lives at{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/embed/lead</code>.
      </p>
    </main>
  );
}
