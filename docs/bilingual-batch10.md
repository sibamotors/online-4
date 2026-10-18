# Bilingualization batch 10: authentication and shared error messages

This batch extends the shared Persian/English lookup table for password validation, account-management responses, sign-in errors, temporary lockout messages, and common image/profile errors. Error toasts in user administration, permissions, reports, messaging, and the application shell now pass server-returned messages through `t(...)`. The login screen synchronizes its language toggle with the shared language provider and translates returned login errors. The application-level error component also uses the shared translator.

## Verification

- `node --test scripts/*.test.mjs`: 27 tests passed.
- `node --experimental-strip-types --test src/lib/jalali.test.ts src/lib/kanban-metrics.test.ts`: 9 tests passed.
- Full application build and TypeScript check were not run because project dependencies are not installed in this environment.
