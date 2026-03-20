"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/deals", label: "Deals" },
  { href: "/tasks", label: "Tasks" },
  { href: "/lenders", label: "Lenders" },
  { href: "/settings/integrations", label: "Integrations" },
] as const;

export function AppTopNav() {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-1 min-[480px]:gap-2">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            CRM
          </span>
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`crm-nav-link rounded-md border-b-2 px-2.5 py-2 ${
                  active
                    ? "crm-nav-link-active border-slate-900 bg-slate-50 text-slate-900"
                    : "border-transparent hover:border-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <Link href="/leads/new" className="btn-primary shrink-0 text-xs sm:text-sm">
          New Lead
        </Link>
      </nav>
    </header>
  );
}
