"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo, LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";
import { CRM_NAV_MAIN, CRM_NAV_SECONDARY } from "./nav-config";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname() ?? "";
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`adm-sidebar-link group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
        active
          ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
          active ? "bg-emerald-400" : "bg-slate-600 group-hover:bg-slate-500"
        }`}
        aria-hidden
      />
      {label}
    </Link>
  );
}

export function CrmAppShell({
  children,
  workspaceDisplayName,
}: {
  children: React.ReactNode;
  /** Shown in sidebar / top bar — organization name */
  workspaceDisplayName: string;
}) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="adm-shell flex min-h-screen bg-[var(--adm-bg)] text-slate-900">
      {/* Mobile overlay */}
      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <aside
        className={`adm-sidebar fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl transition-transform duration-200 lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-white/5 px-4 py-5 sm:px-5">
          <Link href="/dashboard" className="flex min-w-0 items-start gap-3 rounded-lg outline-none ring-offset-2 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-emerald-400/40">
            <Logo variant="onDark" tagline={workspaceDisplayName} href={null} className="min-w-0" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Menu</p>
          <div className="space-y-1">
            {CRM_NAV_MAIN.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
          <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Settings
          </p>
          <div className="space-y-1">
            {CRM_NAV_SECONDARY.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </nav>

        <div className="border-t border-white/5 px-4 py-4">
          <p className="px-1 text-[10px] leading-snug text-slate-500">{LENDEX_PRODUCT_OF_AERO_SYSTEMS}</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
        <header className="adm-topbar sticky top-0 z-30 flex min-h-[4rem] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-7 lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              onClick={() => setMobileNav((o) => !o)}
              aria-expanded={mobileNav}
              aria-label="Toggle navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-800">{workspaceDisplayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/leads/new"
              className="adm-btn-primary hidden text-sm sm:inline-flex"
            >
              New lead
            </Link>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9 rounded-lg",
                  },
                }}
              />
            </div>
          </div>
        </header>

        <main className="adm-main flex-1 px-5 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
