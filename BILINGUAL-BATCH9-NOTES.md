# SibaMotor bilingual batch 9 — shell, navigation, people, reminders, appearance

This package includes batch 8 and the following additional changes:

- The application shell now uses the shared language provider instead of a separate local language state; switching languages updates the app without a full page reload.
- Navigation labels, backup/restore messages, board switching/archive actions, account menu, and search placeholders use the shared translation lookup.
- Command palette labels, result-empty state, and search helper text are translated.
- People directory and person dialog labels, my-tasks empty state/overdue labels, due-reminder actions, and online/offline accessible labels are translated.
- Appearance settings translate theme, accent, and font names/hints, while preserving font preview samples.
- `scripts/i18n-integrity.test.mjs` includes an additional coverage check for the app shell, command palette, people, reminders, and appearance settings.

## Verification

- `npm test`: passed (26 script tests + 9 TypeScript unit tests = 35 tests).
- Full typecheck/build are still not confirmed because dependency installation timed out in this environment; `typescript`, Vite, and type definitions were not available in a valid complete install. In a complete environment run `npm ci`, `npm run typecheck`, and `npm run build`, then smoke-test both languages in the browser.

The package is an incremental bilingualization batch, not a claim that every remaining page and all dynamic server messages across the application have been fully validated.
