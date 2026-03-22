import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LendexLanding } from "@/components/marketing/LendexLanding";

export const metadata: Metadata = {
  title: "Lendex — Match leads to lenders in seconds",
  description:
    "Rank lenders against every lead, track multi-lender submissions, and run deal workflow in one workspace for business finance teams.",
};

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <LendexLanding />;
}
