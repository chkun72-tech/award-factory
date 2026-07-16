# Architecture note

## Current MVP

- Frontend: Vite + React + TypeScript.
- Local persistence: browser localStorage for immediate usability without credentials.
- Domain logic: pure TypeScript modules for scoring, decisions, reminders, time display, and import preview/apply.
- Database target: PostgreSQL/Supabase schema in `database/migrations/001_initial_schema.sql`.
- Import path: CSV in browser; Excel script in `scripts/import-award-factory.ts`.

## Safety boundaries

- External competition submission is manual only.
- Imported opportunities enter `Needs review` unless explicitly verified.
- Manual decision override requires an override reason.
- Source URL, raw deadline text, normalized UTC deadline, verification status, and verified timestamp are preserved.

## Source adapter interface for Phase 2

Each adapter should implement:

1. `fetch`
2. `parse`
3. `normalize`
4. `deduplicate`
5. `mark_for_review`

Adapters must respect terms, robots, rate limits, and source attribution.

## Known limitations

- Authentication is represented in schema and README, not wired in MVP UI.
- PostgreSQL/Supabase connection is prepared but not active.
- Email digest has provider abstraction requirement documented, but no provider is enabled.
- Browser CSV import is implemented; full workbook import is available as a local script once the actual workbook exists in the project.
