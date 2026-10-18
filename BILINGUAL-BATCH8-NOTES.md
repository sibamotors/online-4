# SibaMotor bilingual batch 8 — reports, activity, users, permissions, and security

This batch builds on the previous bilingual batch 7 archive and updates:

- Report inbox/sent views, report detail, review status, archive controls, print/PDF labels, and report CSV labels.
- Report creation/forward/reply dialog, including translated report templates, validation messages, and locale-aware number formatting.
- Activity log labels, filters, export headers, locale-aware dates/times/numbers, and common dynamic card-change descriptions.
- User administration, profile photo dialog, board permissions panel, and password/PIN dialogs.
- Shared English lookup vocabulary for report labels, audit categories, server validation errors, permissions, messaging, and account security.
- `scripts/i18n-integrity.test.mjs` now verifies the report/activity/user/profile/security UI translation coverage.

## Verification

- `npm test`: passed (24 script tests + 9 TypeScript unit tests = 33 tests).
- Full `npm run typecheck` and `npm run build` were attempted but could not be verified: dependency installation was interrupted in this environment, leaving `typescript`, `@types/node`, `vite/client`, and the Vite executable unavailable/invalid. Run `npm ci`, then `npm run typecheck`, `npm run build`, and the browser smoke test in a complete environment.

This batch is not a claim that every remaining project component is now bilingual. Settings, broader server-error display paths, and full end-to-end browser validation remain for later batches.
