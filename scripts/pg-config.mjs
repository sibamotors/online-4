// @ts-check
/**
 * How we connect to Postgres. Shared by the app (src/lib/db.ts) and the
 * migrator (scripts/migrate.mjs).
 */

/**
 * SSL rules:
 *  - DATABASE_SSL=disable          → never use SSL
 *  - DATABASE_SSL=require          → TLS, verify the server certificate
 *  - URL already has sslmode=…     → leave it to the pg driver
 *  - localhost / 127.0.0.1 / dotless host (docker service name) → no SSL
 *  - any other host                → TLS, verify the certificate
 * @param {string} databaseUrl
 * @returns {false | { rejectUnauthorized: boolean } | undefined}
 */
export function sslFor(databaseUrl) {
  const mode = (process.env.DATABASE_SSL || "").trim().toLowerCase();
  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: true };
  if (/[?&]sslmode=/i.test(databaseUrl)) return undefined;
  let host = "";
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return undefined;
  }
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1" || !host.includes(".")) {
    return false;
  }
  return { rejectUnauthorized: true };
}

/**
 * @param {string} databaseUrl
 * @param {{ max?: number }} [opts]
 */
export function poolConfig(databaseUrl, opts = {}) {
  const ssl = sslFor(databaseUrl);
  return {
    connectionString: databaseUrl,
    ...(ssl === undefined ? {} : { ssl }),
    max: opts.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}
