import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LENDEX_PRODUCT_OF_AERO_SYSTEMS } from "@/components/brand";
import { ContentCard, FeatureHighlightCard } from "@/components/crm-shell";

const marketingScreens = {
  dashboard: {
    src: "/marketing/dashboard.png",
    alt: "Lendex dashboard showing pipeline metrics and recent leads",
    width: 1024,
    height: 429,
  },
  leadsList: {
    src: "/marketing/leads-list.png",
    alt: "Lendex leads list with pipeline table",
    width: 1024,
    height: 434,
  },
  leadDetail: {
    src: "/marketing/lead-detail.png",
    alt: "Lendex lead detail with contact and lender fit",
    width: 1024,
    height: 438,
  },
  deals: {
    src: "/marketing/deals.png",
    alt: "Lendex deals board with kanban stages",
    width: 1024,
    height: 451,
  },
} as const;

const steps = [
  {
    n: "01",
    title: "Capture leads",
    body: "Embed a form or add leads manually with the funding fields your lenders need.",
  },
  {
    n: "02",
    title: "Match automatically",
    body: "Rank active lenders against each lead with clear scores and explanations.",
  },
  {
    n: "03",
    title: "Prioritize outreach",
    body: "See strong fits first—spend time on lenders that actually match the case.",
  },
  {
    n: "04",
    title: "Track to funding",
    body: "Link lenders to deals, log activity, and keep everyone aligned in one workspace.",
  },
] as const;

const featureItems: {
  title: string;
  description: string;
  tone: "violet" | "emerald" | "amber";
  icon: ReactNode;
}[] = [
  {
    title: "Lender matching",
    tone: "violet",
    description:
      "Score every active lender against a lead’s profile in seconds—no manual matrix, no guesswork on who to call first.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    title: "Multi-lender tracking",
    tone: "emerald",
    description:
      "Select multiple lenders per deal, record submissions, and follow each relationship without losing context.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "Deal workflow",
    tone: "amber",
    description:
      "Pipeline stages, tasks, and notes tied to leads and deals so your team always knows what’s next.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
];

function SectionIntro({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? <p className="crm-field-label">{eyebrow}</p> : null}
      <h2 className={`text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl ${eyebrow ? "mt-2" : ""}`}>
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

type ProductScreenshot = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
};

/** Product preview frame — matches `adm-content-card` / table shell styling. */
function ProductFrame({
  label,
  subtitle,
  chromeTitle = "lendex.app",
  className = "",
  minHeightClass = "min-h-[160px] sm:min-h-[200px] lg:min-h-[240px]",
  image,
}: {
  label: string;
  subtitle?: string;
  /** Shown in faux window chrome (e.g. dashboard / lead / deal). */
  chromeTitle?: string;
  className?: string;
  minHeightClass?: string;
  /** When set, shows a real product screenshot instead of the placeholder block. */
  image?: ProductScreenshot;
}) {
  return (
    <figure className={`adm-content-card overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-adm ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        </div>
        <div className="mx-auto flex-1 truncate text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {chromeTitle}
        </div>
        <div className="w-14 shrink-0" aria-hidden />
      </div>
      {image ? (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority={image.priority}
          />
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center bg-slate-50/80 px-6 py-8 text-center sm:px-8 sm:py-10 ${minHeightClass}`}
        >
          <span className="crm-field-label text-[10px] tracking-widest text-slate-400">Screenshot</span>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{label}</p>
          {subtitle ? <p className="mt-2 max-w-md text-sm text-slate-600">{subtitle}</p> : null}
        </div>
      )}
      {(image && (label || subtitle)) ? (
        <figcaption className="border-t border-slate-100 bg-white px-4 py-3 text-center sm:px-5">
          <p className="text-sm font-semibold tracking-tight text-slate-900">{label}</p>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{subtitle}</p> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function LendexLanding() {
  return (
    <div className="min-h-screen bg-[var(--adm-bg)] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="crm-container flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight text-slate-900">Lendex</span>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link href="#features" className="btn-secondary-sm hidden sm:inline-flex">
              Product
            </Link>
            <Link href="#pricing" className="btn-secondary-sm hidden md:inline-flex">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/subscribe" className="adm-btn-primary">
              Subscribe
            </Link>
          </nav>
        </div>
      </header>

      <main className="crm-container max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="border-b border-slate-200/80 py-8 sm:py-10 lg:py-11">
          <div className="mx-auto max-w-3xl text-center">
            <p className="crm-field-label">Business finance CRM</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
              Match leads to lenders in seconds
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Lendex ranks your lender book against each lead, shows who to contact first, and keeps deals, tasks, and
              activity in one workspace—built for broker teams who need speed without sacrificing rigor.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/sign-up" className="btn-primary justify-center sm:min-w-[11rem]">
                Get started
              </Link>
              <Link href="/sign-in" className="btn-secondary justify-center sm:min-w-[11rem]">
                Sign in
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-5xl sm:mt-9">
            <ProductFrame
              label="Dashboard"
              chromeTitle="dashboard · overview"
              subtitle="Leads, deals, tasks, and what needs attention in one workspace."
              image={{ ...marketingScreens.dashboard, priority: true }}
            />
          </div>
        </section>

        {/* Features — StatCard-style accents */}
        <section className="border-b border-slate-200/80 py-10 sm:py-12" id="features">
          <SectionIntro
            eyebrow="Product"
            title="Built for how you actually work"
            description="The same pillars you use inside the app—matching, tracking, and pipeline—front and center."
          />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:mt-9 lg:grid-cols-3 lg:gap-6">
            {featureItems.map((f) => (
              <li key={f.title}>
                <FeatureHighlightCard
                  title={f.title}
                  description={f.description}
                  tone={f.tone}
                  icon={f.icon}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* How it works — CRM ContentCard */}
        <section className="py-10 sm:py-12" id="how-it-works">
          <ContentCard
            title="How it works"
            description="From capture to tracked applications—linear steps your whole team can follow."
            padding="md"
          >
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 shadow-sm"
                >
                  <span className="text-xs font-semibold tabular-nums text-slate-400">{step.n}</span>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </ContentCard>
        </section>

        {/* Screenshots */}
        <section className="border-t border-slate-200/80 py-10 sm:py-12" id="product">
          <ContentCard
            title="In the app"
            description="The same surfaces your team uses every day—pipeline, records, and deal board."
            padding="md"
          >
            <div className="flex flex-col gap-6 lg:gap-8">
              <ProductFrame
                label="Leads"
                chromeTitle="leads · pipeline"
                subtitle="Full pipeline table: name, company, source, amount, status, and dates."
                image={marketingScreens.leadsList}
              />
              <ProductFrame
                label="Lead record"
                chromeTitle="leads · detail"
                subtitle="Contact details, origin, and actions like email and create deal."
                image={marketingScreens.leadDetail}
              />
              <ProductFrame
                label="Deals"
                chromeTitle="deals · board"
                subtitle="Kanban by stage—value, lenders, and progress at a glance."
                image={marketingScreens.deals}
              />
            </div>
          </ContentCard>
        </section>

        {/* Pricing */}
        <section className="py-10 sm:py-12" id="pricing">
          <ContentCard
            title="Pricing"
            description="One paid plan per organization, billed monthly. Add seats as you grow."
            padding="lg"
            className="max-w-lg mx-auto"
          >
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-6 sm:p-7">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Lendex</h3>
              <p className="mt-1 text-sm text-slate-500">Per organization</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-5xl">£39</span>
                <span className="text-base font-semibold text-slate-600">/month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-left text-sm leading-relaxed text-slate-700">
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" aria-hidden />
                  <span>Includes up to 3 users</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" aria-hidden />
                  <span>Add additional users for £10/month each</span>
                </li>
              </ul>
              <Link href="/subscribe" className="btn-primary mt-6 flex w-full justify-center">
                Subscribe — £39/month
              </Link>
            </div>
          </ContentCard>
        </section>

        {/* Bottom CTA — slate shell aligned with app sidebar tone */}
        <section className="pb-12 pt-2 sm:pb-14">
          <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950 px-6 py-10 text-center shadow-adm-lg sm:px-10 sm:py-11">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              See your next best lender on every lead
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              Subscribe for £39/month per workspace, then invite your team. Payment is processed securely through Stripe
              Checkout.
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/subscribe"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-adm hover:bg-slate-100"
              >
                Subscribe
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-transparent px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-8 sm:px-6">
        <div className="crm-container flex max-w-6xl flex-col items-center justify-between gap-5 text-sm text-slate-500 sm:flex-row lg:px-8">
          <span className="font-semibold text-slate-800">Lendex</span>
          <div className="flex gap-8">
            <Link href="/sign-in" className="font-semibold text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/sign-up" className="font-semibold text-slate-600 hover:text-slate-900">
              Sign up
            </Link>
          </div>
        </div>
        <p className="crm-container mx-auto mt-6 max-w-6xl px-4 text-center text-[11px] leading-snug text-slate-400 sm:px-6 lg:px-8">
          {LENDEX_PRODUCT_OF_AERO_SYSTEMS}
        </p>
      </footer>
    </div>
  );
}
