# SibaMotor bilingual completion batches 13–16

## Batch 13 — dynamic data and activity text
- Extended historical activity localization for board creation/renaming/archive, column creation/renaming/deletion, card creation/deletion/comments/copy, people changes, and label creation/deletion.
- Historical records are translated at display time; persisted data is not rewritten.
- Added regression tests for the new activity patterns.

## Batch 14 — locale formatting
- Added `src/lib/locale-format.ts` with shared language-aware number, date, and date-time formatting helpers.
- Persian uses `fa-IR` numbers and the Persian calendar; English uses `en-US` numbers and the Gregorian calendar.
- Corrected English date calendar identifiers in notification, message, and Scrum date displays from Persian calendar to Gregorian.
- Invalid date values return an em dash rather than throwing a formatting exception.

## Batch 15 — verification
- Added locale formatting tests and included them in the package test script.
- Ran repository script tests and direct Node tests for date/metrics/activity/locale helpers where supported.
- Build and TypeScript checks require dependency installation; results are reported explicitly below rather than presumed.

## Batch 16 — packaging and remaining limitations
- This ZIP contains the complete project source from batch 12 plus batches 13–16 changes.
- Unknown user-authored or unrecognized historical activity strings are intentionally preserved instead of guessed/translated incorrectly.
- The Jalali picker remains Jalali in both languages; this work fixes English formatting where the relevant Intl calendar was incorrectly set to Persian, but does not redesign the picker as a Gregorian calendar UI.
- Full browser/E2E testing has not been confirmed in this environment.
