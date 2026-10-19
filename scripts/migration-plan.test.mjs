import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/0003_x.sql"), "0003_x.sql");
  assert.equal(migrationName("0004_y.sql"), "0004_y.sql");
});

test("a file already applied does not re-apply, whichever directory it came from", () => {
  assert.deepEqual(pendingMigrations(["/migrations/0002_a.sql"], ["0002_a.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped", () => {
  assert.equal(isMigrationFile("sub"), false);
  assert.deepEqual(pendingMigrations(["sub", "README.md"], []), []);
});

test("every file in migrations/ is a numbered .sql file with a unique number", () => {
  const files = readdirSync(migrationsDir);
  assert.ok(files.length > 0);
  const numbers = new Set();
  for (const f of files) {
    assert.match(f, /^\d{4}_[a-z0-9_]+\.sql$/, `unexpected file in migrations/: ${f}`);
    const n = f.slice(0, 4);
    assert.ok(!numbers.has(n), `duplicate migration number ${n}`);
    numbers.add(n);
  }
});
