import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lendex",
  description: "Match leads to lenders, track submissions, and run deal workflow in one workspace.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-[var(--adm-bg)] text-slate-900 antialiased"
        suppressHydrationWarning
      >
        <ClerkProvider
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
