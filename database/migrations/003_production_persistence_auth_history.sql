create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null default 'Award Factory Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects add column if not exists user_id uuid;
alter table projects add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table projects add column if not exists created_at timestamptz not null default now();
alter table projects add column if not exists updated_at timestamptz not null default now();

alter table opportunities add column if not exists user_id uuid;
alter table opportunities add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table opportunities add column if not exists version int not null default 1;
alter table opportunities add column if not exists raw_deadline_text text;
alter table opportunities add column if not exists deadline_timezone text not null default 'Australia/Sydney';
alter table opportunities add column if not exists deadline_parse_status text not null default 'not_provided';
alter table opportunities add column if not exists deadline_parse_note text;
alter table opportunities add column if not exists automatic_decision text;
alter table opportunities add column if not exists manual_decision_override text;
alter table opportunities add column if not exists manual_override_reason text;
alter table opportunities add column if not exists manual_override_by uuid;
alter table opportunities add column if not exists manual_override_at timestamptz;
alter table opportunities add column if not exists effective_decision text generated always as (coalesce(manual_decision_override, automatic_decision, decision)) stored;

alter table opportunity_scores add column if not exists user_id uuid;
alter table opportunity_scores add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table opportunity_scores add column if not exists created_at timestamptz not null default now();
alter table opportunity_scores add column if not exists updated_at timestamptz not null default now();

alter table opportunity_project_matches add column if not exists user_id uuid;
alter table opportunity_project_matches add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table opportunity_project_matches add column if not exists updated_at timestamptz not null default now();

alter table opportunity_verifications add column if not exists user_id uuid;
alter table opportunity_verifications add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table opportunity_verifications add column if not exists created_at timestamptz not null default now();
alter table opportunity_verifications add column if not exists updated_at timestamptz not null default now();

alter table submissions add column if not exists user_id uuid;
alter table submissions add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table submissions add column if not exists updated_at timestamptz not null default now();

alter table submission_status_history add column if not exists user_id uuid;
alter table submission_status_history add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table submission_status_history add column if not exists created_at timestamptz not null default now();
alter table submission_status_history add column if not exists updated_at timestamptz not null default now();

alter table reminders add column if not exists user_id uuid;
alter table reminders add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table reminders add column if not exists deadline_type text not null default 'final';
alter table reminders add column if not exists deadline_utc timestamptz;
alter table reminders add column if not exists offset_key text;
alter table reminders add column if not exists idempotency_key text;
alter table reminders add column if not exists status text not null default 'pending';
alter table reminders add column if not exists created_at timestamptz not null default now();
alter table reminders add column if not exists updated_at timestamptz not null default now();
create unique index if not exists reminders_idempotency_key_idx on reminders(idempotency_key);

alter table activity_logs add column if not exists user_id uuid;
alter table activity_logs add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table activity_logs add column if not exists updated_at timestamptz not null default now();

alter table import_jobs add column if not exists user_id uuid;
alter table import_jobs add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table import_jobs add column if not exists completed_at timestamptz;
alter table import_jobs add column if not exists create_count int not null default 0;
alter table import_jobs add column if not exists updated_at timestamptz not null default now();

alter table import_job_rows add column if not exists user_id uuid;
alter table import_job_rows add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table import_job_rows add column if not exists created_at timestamptz not null default now();
alter table import_job_rows add column if not exists updated_at timestamptz not null default now();

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  timezone text not null default 'Australia/Sydney',
  stale_threshold_days int not null default 30 check (stale_threshold_days > 0),
  urgent_stale_threshold_days int not null default 7 check (urgent_stale_threshold_days > 0),
  urgent_deadline_window_days int not null default 30 check (urgent_deadline_window_days > 0),
  reminder_offsets text[] not null default array['T-30 days','T-14 days','T-7 days','T-3 days','T-24 hours'],
  email_notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

create table if not exists deadline_override_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  opportunity_id text not null references opportunities(id) on delete cascade,
  previous_value timestamptz,
  new_value timestamptz,
  override_reason text not null check (length(trim(override_reason)) > 0),
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_digest_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text not null default 'disabled',
  status text not null default 'pending',
  subject text not null,
  body text not null,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  source_name text not null,
  mode text not null check (mode in ('preview','apply')),
  backup_sha256 text,
  create_count int not null default 0,
  update_count int not null default 0,
  skip_count int not null default 0,
  error_count int not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table opportunities enable row level security;
alter table opportunity_scores enable row level security;
alter table opportunity_project_matches enable row level security;
alter table opportunity_verifications enable row level security;
alter table submissions enable row level security;
alter table submission_status_history enable row level security;
alter table reminders enable row level security;
alter table activity_logs enable row level security;
alter table import_jobs enable row level security;
alter table import_job_rows enable row level security;
alter table app_settings enable row level security;
alter table deadline_override_history enable row level security;
alter table email_digest_records enable row level security;
alter table migration_runs enable row level security;

drop policy if exists workspaces_owner_policy on workspaces;
create policy workspaces_owner_policy on workspaces using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
drop policy if exists profiles_owner_policy on profiles;
create policy profiles_owner_policy on profiles using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists projects_owner_policy on projects;
create policy projects_owner_policy on projects using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists opportunities_owner_policy on opportunities;
create policy opportunities_owner_policy on opportunities using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists opportunity_scores_owner_policy on opportunity_scores;
create policy opportunity_scores_owner_policy on opportunity_scores using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists opportunity_project_matches_owner_policy on opportunity_project_matches;
create policy opportunity_project_matches_owner_policy on opportunity_project_matches using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists opportunity_verifications_owner_policy on opportunity_verifications;
create policy opportunity_verifications_owner_policy on opportunity_verifications using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists submissions_owner_policy on submissions;
create policy submissions_owner_policy on submissions using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists submission_status_history_owner_policy on submission_status_history;
create policy submission_status_history_owner_policy on submission_status_history using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reminders_owner_policy on reminders;
create policy reminders_owner_policy on reminders using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists activity_logs_owner_policy on activity_logs;
create policy activity_logs_owner_policy on activity_logs using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists import_jobs_owner_policy on import_jobs;
create policy import_jobs_owner_policy on import_jobs using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists import_job_rows_owner_policy on import_job_rows;
create policy import_job_rows_owner_policy on import_job_rows using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists app_settings_owner_policy on app_settings;
create policy app_settings_owner_policy on app_settings using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists deadline_override_history_owner_policy on deadline_override_history;
create policy deadline_override_history_owner_policy on deadline_override_history using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists email_digest_records_owner_policy on email_digest_records;
create policy email_digest_records_owner_policy on email_digest_records using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists migration_runs_owner_policy on migration_runs;
create policy migration_runs_owner_policy on migration_runs using (user_id = auth.uid()) with check (user_id = auth.uid());
