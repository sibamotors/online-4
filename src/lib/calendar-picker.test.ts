import test from "node:test";
import assert from "node:assert/strict";
import { gregorianMonthDays, gregorianMonthWeekdayOffset, gregorianToIso, isoToGregorianParts } from "./calendar-picker.ts";

test("Gregorian picker handles leap and common years", () => {
  assert.equal(gregorianMonthDays(2024, 2), 29);
  assert.equal(gregorianMonthDays(2025, 2), 28);
  assert.equal(gregorianMonthDays(2026, 4), 30);
});

test("Gregorian picker starts each month on the correct Sunday-based weekday", () => {
  assert.equal(gregorianMonthWeekdayOffset(2026, 1), 4); // Thursday
  assert.equal(gregorianMonthWeekdayOffset(2026, 2), 0); // Sunday
});

test("picker dates round-trip as canonical ISO dates and reject invalid dates", () => {
  assert.equal(gregorianToIso(2026, 10, 18), "2026-10-18");
  assert.deepEqual(isoToGregorianParts("2024-02-29"), [2024, 2, 29]);
  assert.equal(isoToGregorianParts("2025-02-29"), null);
  assert.equal(isoToGregorianParts("not-a-date"), null);
});
