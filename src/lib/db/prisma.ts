import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Next.js + Postgres:
 *
 * - **Neon** (DATABASE_URL host contains `neon.tech` / `neon.build`): use `PrismaNeon` + the
 *   **pooled** connection string (hostname includes `-pooler`). This avoids
 *   `MaxClientsInSessionMode` from Neon's session pooler when using `pg`/TCP.
 *   Set `PRISMA_USE_NEON=1` to force the Neon adapter even if the hostname check fails.
 *
 * - **Other Postgres**: `PrismaPg` + `pg` Pool with a small `max` (see `DATABASE_POOL_MAX`).
 */
const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function isNeonHost(connectionString: string): boolean {
  if (process.env.PRISMA_USE_NEON === "1") return true;
  try {
    const normalized = connectionString
      .replace(/^postgresql:\/\//i, "http://")
      .replace(/^postgres:\/\//i, "http://");
    const host = new URL(normalized).hostname.toLowerCase();
    return host.endsWith(".neon.tech") || host.endsWith(".neon.build");
  } catch {
    return /neon\.(tech|build)/i.test(connectionString);
  }
}

function warnIfNeonUrlMissingPooler(connectionString: string) {
  if (process.env.NODE_ENV !== "development") return;
  if (!isNeonHost(connectionString)) return;
  try {
    const normalized = connectionString
      .replace(/^postgresql:\/\//i, "http://")
      .replace(/^postgres:\/\//i, "http://");
    const host = new URL(normalized).hostname.toLowerCase();
    if (!host.includes("pooler")) {
      console.warn(
        "[db] DATABASE_URL uses Neon but the host does not look pooled (expected `-pooler` in the host). " +
          "Copy the “Transaction” / pooled URI from the Neon dashboard to avoid connection limit errors.",
      );
    }
  } catch {
    /* ignore */
  }
}

function poolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.min(Math.floor(n), 100);
  }
  return 1;
}

export function getPrisma(): PrismaClient {
  if (globalForDb.prisma) return globalForDb.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  warnIfNeonUrlMissingPooler(connectionString);

  const adapter = isNeonHost(connectionString)
    ? new PrismaNeon({ connectionString })
    : new PrismaPg(
        (globalForDb.pgPool ??=
          new Pool({
            connectionString,
            max: poolMax(),
            idleTimeoutMillis: 20_000,
            connectionTimeoutMillis: 15_000,
          })),
      );

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  globalForDb.prisma = prisma;
  return prisma;
}
