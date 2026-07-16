# Award Factory｜國際競賽工廠

可運行 MVP，用來管理國際競賽、hackathon、startup pitch、innovation challenge、Australian grants、accelerators、awards 和 open calls。

## MVP includes

- Dashboard metrics and recommended actions.
- Opportunity Radar with search, filters, sorting, add, edit, archive, CSV/Excel file import preview/apply, pasted CSV import, import history, and CSV export.
- Opportunity Detail with source URL, eligibility, deadlines, Sydney display time, scoring, decision override, verification and pipeline context.
- Verification history with previous/new status, verifier, timestamp, source URL, changed fields, and notes.
- Stale-data warnings: verified prize, eligibility, and deadline data is flagged when it exceeds the configured freshness threshold, with a shorter threshold for opportunities due within 30 days.
- Submission status history for Watch, Open, Registered, Building, Ready for QA, Submitted, Finalist, Won, Lost, Closed, Paused, and Skip.
- Project Profiles for Handyman AI, ETF Backtesting, AI OS Factory, Australian Service Website.
- Submission Kit asset tracking.
- Submission Pipeline statuses.
- Sources registry.
- 100-point scoring model and decision rules.
- Reminder calculation for T-30, T-14, T-7, T-3, and T-24 hours.
- PostgreSQL/Supabase-ready migration, RLS ownership policies, repository/provider boundary, and isolated local test repository.
- Settings screen for timezone, stale thresholds, reminder offsets, and email notification toggle.
- Server-side reminder generation entrypoint and email provider abstraction (`disabled`, `console`, future provider).
- Excel import preview script.
- Unit and smoke tests.

## Local setup

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run acceptance:persistence -- --file ".\award-factory-seed.xlsx"
npm run acceptance:import -- --file ".\award-factory-seed.xlsx"
npm run build
```

## Current milestone workflow

Opportunity Detail now supports editing the main fields needed to decide what to do next: official source URL, organizer, type, eligibility, country/entity restrictions, prize/funding, entry fee, next critical deadline, final deadline, raw deadline text, normalized UTC deadline, Sydney display time, deliverables, required technology, IP/licence notes, travel requirements, matched project, score breakdown, automatic decision, manual override, next action, owner, and notes.

Verification statuses are:

- Unverified
- Needs Review
- Verified
- Stale
- Invalid
- Closed

Every verification event records opportunity ID, previous status, new status, verified by, verified at, source URL, changed fields, and note.

Deadline reminders are generated at T-30 days, T-14 days, T-7 days, T-3 days, and T-24 hours. They are stored in UTC, displayed in Australia/Sydney by the UI, deduplicated by opportunity and label, and not generated for Closed, Paused, Skip, or expired opportunities.

Submission status changes record previous status, new status, changed by, changed at, and note.

## Production persistence milestone

The UI still works locally, but business logic now goes through a repository/provider boundary:

- `InMemoryRepository` is used for isolated tests and acceptance runs.
- `SupabaseRepositoryUnavailable` is a safe placeholder so the app never accidentally uses a service-role credential in the browser.
- PostgreSQL/Supabase schema lives in `database/migrations/001_initial_schema.sql`, `002_detail_verification_history.sql`, and `003_production_persistence_auth_history.sql`.
- RLS policies scope mutable business data to `user_id`; `workspace_id` is included for the next multi-user workspace step.

Important production rules:

- Do not expose `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are browser-safe.
- Status changes and verification changes must be transactional: current row, history row, and activity log commit together or roll back together.
- Manual decision override requires a reason and remains effective when automatic scoring is recalculated.
- Deadline UTC is system-calculated in normal use; manual admin override must record previous value, new value, reason, actor, and timestamp.

## LocalStorage to database migration

The migration service supports preview/apply, JSON backup, duplicate classification, create/update/skip/error counts, and row-level errors. It is idempotent and does not delete browser localStorage automatically. After migration, localStorage should only be marked migrated; cleanup is an explicit user action.

## Scheduled reminders and email

Use the dev/manual scheduler-compatible command:

```bash
npm run reminders:generate
```

Reminders are generated server-side with idempotency keys based on user/workspace, opportunity, deadline type, normalized deadline/version, and offset. Closed, Paused, Skip, and expired opportunities are excluded. When a deadline changes, older reminders are superseded and new ones are generated.

Email digest sending is abstracted. `EMAIL_PROVIDER=disabled` is valid and keeps the app functional without a paid provider.

## Backup/restore

`src/lib/backup.ts` exports a versioned JSON backup format for opportunities, scores, matches, verification history, submission status history, reminders, and settings. Restore is preview-only until the user explicitly applies it.

## Excel import

Option A: open the app, go to Opportunity Radar, and use `Preview file` or `Apply file`.

Option B: place `Award_Factory_國際競賽工廠_MVP.xlsx` in this folder, then run:

```bash
npm run import:preview
npm run import:apply
```

The import logic previews create/update/skip/error counts, deduplicates by `id` or `sourceUrl`, and stamps `importedAt` plus `sourceFileName`.

## Deployment

Current MVP builds as a static React app:

```bash
npm run build
```

Deploy the `dist/` folder to any static host. For a production multi-user version, connect the included PostgreSQL schema to Supabase or another managed Postgres service and add authentication.

## Environment

Copy `.env.example` to `.env` when enabling database or email provider integration. Do not commit secrets.

Public browser env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server/job-only env:

- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`

## Known limitations

- The real Supabase adapter still needs project credentials before live production reads/writes can be enabled.
- Authentication UI is still single-user/local-first; RLS and ownership schema are prepared for production.
- Email digest provider abstraction exists, but only disabled/console providers are included.
- Web source adapters are not enabled until terms/robots/rate limits are verified.

## Next phase backlog

1. Add real Supabase client/server adapter once production credentials are available.
2. Add authentication UI and session routing.
3. Add real email provider adapter behind the existing abstraction.
4. Add review queue for source adapters.
5. Add pagination and bulk edit controls for large opportunity lists.
