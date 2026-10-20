import assert from "node:assert/strict";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";

test("migration names are the file's basename", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("0002_todos.sql"), "0002_todos.sql");
});

test("already-applied files are skipped", () => {
  assert.deepEqual(pendingMigrations(["/migrations/0001_a.sql"], ["0001_a.sql"]), []);
});

test("pending migrations come back in name order", () => {
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

test("non-.sql entries are ignored", () => {
  assert.equal(isMigrationFile("README.md"), false);
  assert.deepEqual(pendingMigrations(["notes", "README.md"], []), []);
});
