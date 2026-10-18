import test from "node:test";
import assert from "node:assert/strict";
import { dateLocale, formatDate, formatDateTime, formatNumber, numberLocale } from "./locale-format.ts";

test("number formatting follows the selected UI language", () => {
  assert.equal(numberLocale("fa"), "fa-IR");
  assert.equal(numberLocale("en"), "en-US");
  assert.match(formatNumber(12345, "fa"), /۱۲/);
  assert.match(formatNumber(12345, "en"), /12/);
});

test("English dates use Gregorian calendar and Persian dates use Persian calendar", () => {
  assert.equal(dateLocale("en"), "en-US-u-ca-gregory");
  assert.equal(dateLocale("fa"), "fa-IR-u-ca-persian");
  assert.match(formatDate("2026-01-15T12:00:00Z", "en", { timeZone: "UTC" }), /2026/);
  assert.doesNotThrow(() => formatDateTime("2026-01-15T12:00:00Z", "fa", { timeZone: "UTC" }));
  assert.equal(formatDate("invalid-date", "en"), "—");
});
