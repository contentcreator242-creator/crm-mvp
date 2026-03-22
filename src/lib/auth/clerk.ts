import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "../db/prisma";
import { ApiError } from "../api/errors";

export type TenantContext = {
  tenantId: string;
  clerkOrgId: string;
  clerkUserId: string;
  tenantRole: "admin" | "member";
  isAdmin: boolean;
  isBeta: boolean;
};

/** Clerk session helper — prefer `has({ role: 'org:admin' })`, then common role keys (custom roles often end with `:admin`). */
export function isOrganizationAdminFromSession(
  a: Awaited<ReturnType<typeof auth>>,
): boolean {
  if (!a.userId || !a.orgId) return false;
  if (typeof a.has === "function") {
    try {
      if (a.has({ role: "org:admin" })) return true;
    } catch {
      /* incomplete session claims */
    }
  }
  const r = (a.orgRole ?? "").toLowerCase();
  return (
    r === "admin" ||
    r === "org:admin" ||
    r === "org:owner" ||
    (r.length > 0 && r.endsWith(":admin"))
  );
}

export async function getTenantContext(): Promise<TenantContext> {
  const a = await auth();
  const { userId, orgId } = a;

  if (!userId) {
    throw new ApiError({
      status: 401,
      code: "unauthorized",
      message: "Sign in required",
    });
  }

  if (!orgId) {
    throw new ApiError({
      status: 401,
      code: "unauthorized",
      message: "Select an organization (workspace) to continue",
    });
  }

  const isAdmin = isOrganizationAdminFromSession(a);
  const tenantRole: "admin" | "member" = isAdmin ? "admin" : "member";

  // Map the Clerk Organization to our canonical workspace (Tenant) row.
  const prisma = getPrisma();
  const tenant = await prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, isBeta: false },
    update: {},
    select: {
      id: true,
      isBeta: true,
    },
  });

  return {
    tenantId: tenant.id,
    clerkOrgId: orgId,
    clerkUserId: userId,
    tenantRole,
    isAdmin,
    isBeta: tenant.isBeta,
  };
}

