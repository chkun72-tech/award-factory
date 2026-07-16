alter table opportunities
  add column if not exists next_critical_deadline_utc timestamptz,
  add column if not exists final_deadline_utc timestamptz;

alter table opportunity_verifications
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists verified_by text,
  add column if not exists verified_at timestamptz,
  add column if not exists changed_fields text[] not null default '{}',
  add column if not exists note text;

update opportunity_verifications
set
  previous_status = coalesce(previous_status, result),
  new_status = coalesce(new_status, result),
  verified_by = coalesce(verified_by, checked_by),
  verified_at = coalesce(verified_at, checked_at),
  note = coalesce(note, notes)
where previous_status is null
   or new_status is null
   or verified_by is null
   or verified_at is null
   or note is null;

alter table opportunity_verifications
  alter column previous_status set not null,
  alter column new_status set not null,
  alter column verified_by set not null,
  alter column verified_at set not null;

create index if not exists idx_opportunity_verifications_opportunity_verified_at
  on opportunity_verifications(opportunity_id, verified_at desc);

create index if not exists idx_submission_status_history_opportunity_changed_at
  on submission_status_history(submission_id, changed_at desc);
