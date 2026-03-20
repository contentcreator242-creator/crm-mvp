import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function CreateOrganizationPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Create organization</h1>
        <p className="mb-6 text-sm text-slate-600">
          You need an organization before using the CRM.
        </p>
        <CreateOrganization />
      </div>
    </main>
  );
}

