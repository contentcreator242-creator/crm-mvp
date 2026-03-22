import Link from "next/link";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";

type PageProps = {
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const sessionId = params.session_id;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Subscription confirmed</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Thank you. Your monthly subscription is being activated; your workspace billing details will update shortly
            after Stripe confirms payment.
          </p>
          {sessionId ? (
            <p className="mt-2 font-mono text-[11px] text-slate-400">Reference: {sessionId}</p>
          ) : null}
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex justify-center">
            Go to dashboard
          </Link>
        </div>
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}
