# Bilingualization batch 11

This batch expands English lookup coverage for common file, group, messaging, report, permission, and board errors. Error notifications returned from Scrum controls and file uploads now pass through the shared translator. Activity descriptions shown in the card detail log now localize common historical card-change messages in English without rewriting stored records.

## Verification

- `node --test scripts/*.test.mjs`: 27 tests passed.
- `node --experimental-strip-types --test src/lib/jalali.test.ts src/lib/kanban-metrics.test.ts src/lib/activity-text.test.ts`: 12 tests passed.
- Full application build and TypeScript checks remain unverified because dependencies are not installed in this workspace.
