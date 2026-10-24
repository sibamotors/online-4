import { poolConfig } from "../../scripts/pg-config.mjs";

/**
 * Minimal SQL surface used across the app. Both forms return an array of rows:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from login_users where username = ${name}`;
 *   const rows2 = await sql.query("select * from login_users where username = $1", [name]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

// Kept on globalThis so dev-server hot reloads never open a second pool.
const globalRef = globalThis as typeof globalThis & { __pgSqlPromise__?: Promise<Sql> };

// Make node-postgres return JSON-safe, stable shapes:
//   int8 (incl. count(*))  -> number
//   date                   -> 'YYYY-MM-DD' string
//   interval               -> Postgres interval text
//   timestamptz            -> ISO-8601 string
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const OID_TIMESTAMPTZ = 1184;
const identity = (v: string) => v;
const isoTimestamp = (v: string) => new Date(v).toISOString();

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild the template with $1, $2, … so every value stays parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

async function createSql(): Promise<Sql> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const { Pool, types } = await import("pg");
  types.setTypeParser(OID_INT8, Number);
  types.setTypeParser(OID_DATE, identity);
  types.setTypeParser(OID_INTERVAL, identity);
  types.setTypeParser(OID_TIMESTAMPTZ, isoTimestamp);
  const pool = new Pool(poolConfig(databaseUrl));
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  // background jobs (Bale bot, reminders) start together with the first database use
  void import("./server/background.server")
    .then((m) => m.startBackground())
    .catch((err) => console.error("[background] could not start:", err instanceof Error ? err.message : err));
  return toSql(async <T>(text: string, params: unknown[]) => {
    const res = await pool.query(text, params);
    return res.rows as T[];
  });
}

/**
 * The shared, **server-only** SQL client (one pool per process).
 * Schema comes from `migrations/*.sql` — apply it with `npm run db:migrate`.
 */
export function getSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error("@/lib/db is server-only — call getSql() from a server function.");
  }
  globalRef.__pgSqlPromise__ ??= createSql().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined; // don't memoize failures
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}
