import test from "node:test";
import assert from "node:assert/strict";
import { localizeActivityDescription } from "./activity-text.ts";

const t = (key: string) => ({
  "زیاد": "High",
  "کم": "Low",
}[key] ?? key);

test("activity descriptions stay Persian when Persian is selected", () => {
  assert.equal(localizeActivityDescription("توضیحات کارت را نوشت", "fa", t), "توضیحات کارت را نوشت");
});

test("activity descriptions translate dynamic title and progress values", () => {
  assert.equal(localizeActivityDescription("عنوان را از «Draft» به «Final» تغییر داد", "en", t), "Changed title from “Draft” to “Final”");
  assert.equal(localizeActivityDescription("پیشرفت را از ۲۰٪ به ۷۵٪ رساند", "en", t), "Changed progress from ۲۰% to ۷۵%");
});

test("activity descriptions translate known exact messages and preserve unknown content", () => {
  assert.equal(localizeActivityDescription("توضیحات کارت را نوشت", "en", t), "Added card description");
  assert.equal(localizeActivityDescription("متن سفارشی کاربر", "en", t), "متن سفارشی کاربر");
});

test("activity descriptions cover board, column, card, and people events", () => {
  assert.equal(localizeActivityDescription("تخته «Operations» را ساخت", "en", t), 'Created board “Operations”');
  assert.equal(localizeActivityDescription("ستون «Ready» را ساخت", "en", t), 'Created column “Ready”');
  assert.equal(localizeActivityDescription("کارت «Pump» را در ستون «Ready» ایجاد کرد", "en", t), 'Created card “Pump” in column “Ready”');
  assert.equal(localizeActivityDescription("برچسب «Urgent» را ساخت", "en", t), 'Created label “Urgent”');
});
