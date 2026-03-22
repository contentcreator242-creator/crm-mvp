# Prisma P3005: baselining an existing database (e.g. Supabase)

**Error:** `P3005` — *The database schema is not empty*

That means Postgres already has tables (often from `prisma db push`, an old deploy, or manual setup), but the **`_prisma_migrations`** table is empty or out of sync. Prisma refuses to run `migrate deploy` until you align history with reality.

## 1. See what’s actually in the database

In **Supabase → SQL Editor**, run:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations'
ORDER BY ordinal_position;
```

Check:

| You need | Column / state |
|----------|----------------|
| Onboarding gate | `onboarding_completed_at` on `organizations` |
| Current app schema | No `branding_company_name`, `branding_logo_url`, `branding_primary_color_hex` (dropped by our migration) |

## 2. Bring the DB in line with the repo (if anything is missing)

If a column is **missing**, run the idempotent script once (safe to re-run):

**File:** `scripts/prisma-align-organizations.sql`

Or run the same SQL from that file in the SQL Editor.

## 3. Mark existing migrations as already applied

After the live database matches what those migrations would do, **do not** let Prisma execute them again. Record them as applied:

```bash
cd crm-mvp
npx prisma migrate resolve --applied "20260321120000_onboarding_completed_at"
npx prisma migrate resolve --applied "20260322120000_remove_organization_branding_columns"
```

Use the **exact** folder names under `prisma/migrations/`.

## 4. Verify

```bash
npx prisma migrate deploy
```

You should see something like “Already up to date” or no pending migrations.

## 5. New migrations later

From then on, add new folders under `prisma/migrations/` and run `npx prisma migrate deploy` on Supabase like any other Postgres host.

---

### If you prefer not to baseline

Alternative is a **shadow empty database** only for migration history (advanced). For most teams, **resolve --applied** after manual SQL alignment is enough.

### Links

- [Prisma: Baseline a database](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining)
