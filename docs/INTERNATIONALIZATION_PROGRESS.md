# Internationalization progress

## Batch 1 — Dashboard

- Migrated dashboard labels, filters, KPIs, chart headings, empty states, tooltips, table headings, card status labels, and CSV headers to the shared translation lookup.
- Localized generated insights, priority labels, percent symbols, dates, and numbers for Persian and English.

## Batch 2 — Help guide

- Translated the full help guide content (section titles, paragraphs, steps, tips, and list items) into English through the shared `useTranslation()` lookup.
- Made help search index the currently selected language so English users can search English guide content.
- Localized help button labels and the numbered steps' number format.
- Added translation-integrity tests for dashboard keys and help-guide coverage.

## Batch 3 — Onboarding and daily tips

- Translated all onboarding-tour step titles and descriptions, navigation buttons, and step counters.
- Translated all daily industrial-engineering tips and the daily-tip dialog labels through the shared translation lookup.
- Added coverage tests that fail if onboarding or daily-tip Persian copy is missing an English counterpart.

## Batch 4 — Kanban board and card details

- Migrated the board menu, filters, column controls, card details, checklist controls, copy/move dialogs, and related toasts to the shared translation lookup.
- Localized priority labels, card progress symbols, dates, activity timestamps, and counts for the selected language.
- Translated card-template names, notes, checklist titles, and checklist items when templates are displayed or used to create cards.
- Added integrity coverage for board UI strings and template text.

## Batch 5 — Calendar, Gantt, and Scrum card widgets

- Translated calendar controls, weekday and Persian-month names, sprint markers, task counts, and navigation labels.
- Translated Gantt empty states, timeline descriptions, month labels, and today marker; number formatting follows the selected language.
- Translated Scrum chips and card-level sprint/point controls, including labels, tooltips, and day-count formatting.
- Added translation coverage tests for these components.

## Batch 6 — Scrum workspace

- Migrated Scrum tabs, sprint actions, stand-up prompts, blockers, Definition of Done, backlog, retrospective, velocity summaries, role labels, and empty/loading states to shared translations.
- Localized success/error toasts, confirmation prompts, accessibility labels, point counts, percentages, and sprint date formatting.
- Added integrity coverage for the Scrum workspace strings.

## Batch 7 — Messaging and notifications

- Migrated conversation lists, group creation/management, search, message actions, attachment controls, empty states, confirmation dialogs, and message popups to shared translations.
- Translated notification titles and controls, localized relative timestamps, and switched count formatting and unread badges to the active language.
- Added a translation coverage test for messaging, popups, and notifications.

## Validation

- `node --test scripts/*.test.mjs`: passed (23 tests).
- `node --experimental-strip-types --test src/lib/jalali.test.ts src/lib/kanban-metrics.test.ts`: passed.
- TypeScript syntax transpilation for `dashboard-view.tsx`, `help-panel.tsx`, `onboarding-tour.tsx`, `daily-tip-popup.tsx`, `card-modal.tsx`, `kanban.tsx`, `list-column.tsx`, `task-card.tsx`, `board-context.tsx`, `calendar-view.tsx`, `gantt-view.tsx`, `scrum-badge.tsx`, `scrum-view.tsx`, `messages-view.tsx`, `message-popup.tsx`, `notifications-bell.tsx`, and `i18n.tsx`: passed.
- Full `tsc --noEmit` / production build could not be completed because dependencies were not available locally and package download was unavailable in this environment.

## Remaining batches

Other areas still need migration: onboarding tour, messaging and notifications and notifications, reports, admin/user management, server-side validation messages, and app-wide date/number formatting outside the dashboard and help guide.


## Follow-up: Gregorian picker (batch 17)
The shared date picker now uses a Gregorian calendar in English mode and retains Jalali in Persian mode. Stored and emitted dates remain canonical ISO `YYYY-MM-DD`. See `bilingual-batch17-gregorian-picker.md` for validation and remaining checks.
