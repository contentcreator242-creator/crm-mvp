import { CrmAppShell } from "@/components/crm-shell/CrmAppShell";

export default function CrmRouteLayout({ children }: { children: React.ReactNode }) {
  return <CrmAppShell>{children}</CrmAppShell>;
}
