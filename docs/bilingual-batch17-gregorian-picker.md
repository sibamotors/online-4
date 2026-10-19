# Bilingual follow-up — Gregorian date picker

## Completed
- The shared date picker now follows the selected UI language: Persian shows the Jalali calendar; English shows the Gregorian calendar.
- English month names and Sunday-first weekday labels are used in English mode; Persian month names and Saturday-first weekday labels remain in Persian mode.
- Calendar grid, month lengths, leap-year February, current-day highlight, month navigation, year selector, and displayed digits follow the selected calendar/locale.
- Selection continues to emit canonical `YYYY-MM-DD` ISO dates, so stored values and server APIs do not change.
- Added unit tests for Gregorian leap years, weekday offsets, canonical ISO conversion, and invalid dates.

## Validation
- `node --test scripts/*.test.mjs`: 28 passed, 0 failed.
- `node --experimental-strip-types --test src/lib/jalali.test.ts src/lib/kanban-metrics.test.ts src/lib/activity-text.test.ts src/lib/locale-format.test.ts src/lib/calendar-picker.test.ts`: 18 passed, 0 failed.
- `npm ci --ignore-scripts --no-audit --no-fund` did not finish in this execution environment; the local `node_modules` is incomplete. Therefore TypeScript, Vite build, lint, and browser-based checks remain unverified and must be run after a successful dependency install.
