import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";

export default async function CreateOrganizationPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Create organization</h1>
          <p className="mb-6 text-sm text-slate-600">You need an organization before using the CRM.</p>
          <CreateOrganization />
        </div>
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-400">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
    </main>
  );
}

