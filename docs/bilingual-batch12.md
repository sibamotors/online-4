# Bilingual implementation — Batch 12

This batch continues the Persian/English audit in shared UI primitives and dynamic values.

## Changes

- Shared dialog close button now translates its accessible label with the active language.
- The create-board dialog now translates its title, field labels, and submit action.
- Emoji picker translates its accessible name and category headings.
- Jalali date picker translates navigation and select accessible labels, the clear-date action, month names, and weekday initials through the shared translation layer.
- Jalali picker year digits now follow the selected language (`fa-IR` for Persian, `en-GB` for English).
- Message reaction counts, Scrum stand-up counts, and command-palette board card counts now format numbers according to the selected language instead of always using Persian digits.
- Added an integrity test that checks the shared controls and date/emoji picker Persian literals have English dictionary coverage.

## Verification

- `node --test scripts/*.test.mjs`: passed after this batch.
- Full TypeScript check, production build, and browser/E2E tests remain unverified because dependencies (`node_modules`) are not installed in this workspace.

## Scope note

The date picker remains based on the Jalali calendar in both languages; this batch translates its UI labels and formats digits, but does not convert the English-language picker to a Gregorian calendar. Historical activity text created before localization may also contain Persian text outside the patterns handled by the activity-description localizer.
