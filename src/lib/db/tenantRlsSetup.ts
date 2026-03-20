import { getPrisma } from "./prisma";

/**
 * Idempotently enables Postgres RLS policies for all tenant-scoped tables.
 *
 * Intended to run once during deployment (DB admin credentials required).
 * The runtime tenant scoping is enforced by `withTenantDb()` via:
 * `SET app.current_tenant_id = '<tenantId>'`.
 */
export async function setupTenantRls() {
  const prisma = getPrisma();
  // Note: all tenant-scoped tables have a `tenant_id` column (via @map("tenant_id")).
  const tenantIdExpr =
    "current_setting('app.current_tenant_id', TRUE)::uuid";

  const tables = [
    "contacts",
    "companies",
    "deals",
    "tasks",
    "notes",
    "activity_events",
    "audit_logs",
    "lead_submissions",
    "lender_matches",
    "lender_match_explanations",
    "stripe_customers",
    "subscription_entitlements",
  ];

  // Each statement enables RLS and sets a single isolation policy.
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};

      CREATE POLICY ${table}_tenant_isolation
        ON ${table}
        FOR ALL
        USING (tenant_id = ${tenantIdExpr})
        WITH CHECK (tenant_id = ${tenantIdExpr});
    `);
  }
}

