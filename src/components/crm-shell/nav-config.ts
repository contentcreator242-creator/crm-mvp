export type CrmNavItem = {
  href: string;
  label: string;
  /** Sidebar section label (optional grouping) */
  section?: string;
};

export const CRM_NAV_MAIN: CrmNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/deals", label: "Deals" },
  { href: "/tasks", label: "Tasks" },
  { href: "/lenders", label: "Lenders" },
];

export const CRM_NAV_SECONDARY: CrmNavItem[] = [
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/email-templates", label: "Email templates" },
  { href: "/settings/workspace", label: "Workspace" },
];
