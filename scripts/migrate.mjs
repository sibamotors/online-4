#!/usr/bin/env node
/**
 * Database migrator (node-postgres).
 *
 * Applies pending files from ../migrations to DATABASE_URL — each file in its
 * own transaction, recorded in `_migrations` — and then runs the account
 * bootstrap (scripts/bootstrap.mjs: first admin, locking of old default
 * passwords). Safe to run on every deploy.
 *
 *   npm run db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { hardenAccounts } from "./bootstrap.mjs";
import { pendingMigrations } from "./migration-plan.mjs";
import { poolConfig } from "./pg-config.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const LOCK_ID = 727301; // arbitrary constant: keeps two deploys from migrating at once

async function main() {
  const entries = await readdir(migrationsDir);
  const pool = new pg.Pool(poolConfig(databaseUrl, { max: 1 }));
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name);

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(text); // simple-query protocol: runs a multi-statement file
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // the connection may have died; keep the original error
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");

    await hardenAccounts(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
