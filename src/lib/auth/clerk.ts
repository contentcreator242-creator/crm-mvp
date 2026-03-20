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

function normalizeOrgRole(orgRole: string | null | undefined): {
  tenantRole: "admin" | "member";
  isAdmin: boolean;
} {
  const r = (orgRole ?? "").toLowerCase();
  const isAdmin = r === "admin" || r === "org:admin";
  return { tenantRole: isAdmin ? "admin" : "member", isAdmin };
}

export async function getTenantContext(): Promise<TenantContext> {
  const { userId, orgId, orgRole } = await auth();

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

  const { tenantRole, isAdmin } = normalizeOrgRole(orgRole);

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

