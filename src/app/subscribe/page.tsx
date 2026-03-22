import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";
import { startSubscriptionCheckoutAction } from "./actions";

/** Env for checkout is read at request time — avoid static caching of this route. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function SubscribePage({ searchParams }: PageProps) {
  const { userId, orgId } = await auth();
  const params = searchParams ? await searchParams : {};
  const error = params.error;

  if (!userId) {
    redirect("/sign-in?redirect_url=/subscribe");
  }
  if (!orgId) {
    redirect("/organization/create");
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Subscribe to Lendex</h1>
          <p className="mb-6 text-sm text-slate-600">
            Lendex is a <strong className="font-semibold text-slate-800">paid monthly subscription</strong> for this
            workspace (see pricing on the site). Continuing opens{" "}
            <strong className="font-semibold text-slate-800">Stripe Checkout</strong> to enter payment details and
            activate your subscription.
          </p>

          {error ? (
            <div
              className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <form action={startSubscriptionCheckoutAction}>
            <button type="submit" className="btn-primary w-full justify-center">
              Continue to Stripe Checkout
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            <Link href="/dashboard" className="font-medium text-slate-900 hover:underline">
              Back to app
            </Link>
            {" · "}
            <Link href="/#pricing" className="font-medium text-slate-900 hover:underline">
              Pricing
            </Link>
          </p>
        </div>
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}
