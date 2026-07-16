create table users (
  id text primary key,
  email text unique not null,
  name text not null,
  role text not null default 'operator',
  created_at timestamptz not null default now()
);

create table projects (
  id text primary key,
  project_name text not null,
  positioning text not null,
  stage text not null,
  target_users text,
  problem text,
  solution text,
  technology text,
  live_url text,
  repository_url text,
  users text,
  revenue text,
  traction text,
  evidence text,
  suitable_competition_categories text[],
  missing_evidence text,
  owner text
);

create table opportunity_sources (
  id text primary key,
  source_url text not null,
  organizer text,
  raw_payload jsonb,
  imported_at timestamptz,
  source_file_name text
);

create table opportunities (
  id text primary key,
  name text not null,
  organizer text,
  type text not null,
  source_url text not null unique,
  eligibility text,
  country_restrictions text,
  company_stage_restrictions text,
  prize_funding numeric default 0,
  entry_fee numeric default 0,
  next_critical_deadline timestamptz,
  final_deadline timestamptz,
  raw_deadline_text text,
  normalized_deadline_utc timestamptz,
  timezone text not null default 'UTC',
  required_technology text,
  required_deliverables text,
  ip_licence_notes text,
  travel_requirements text,
  matched_project_id text references projects(id),
  decision text not null,
  decision_override text,
  override_reason text,
  next_action text,
  owner text,
  internal_notes text,
  eligibility_status text not null default 'Unclear',
  verification_status text not null default 'Unverified',
  verified_at timestamptz,
  pipeline_status text not null default 'Watch',
  imported_at timestamptz,
  source_file_name text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunity_verifications (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  checked_by text,
  checked_at timestamptz not null default now(),
  source_url text not null,
  result text not null,
  notes text
);

create table opportunity_scores (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  project_fit int not null,
  prize_business_value int not null,
  winability int not null,
  reusability int not null,
  deadline_readiness int not null,
  exposure int not null,
  ease int not null,
  total_score int not null,
  calculated_at timestamptz not null default now()
);

create table opportunity_project_matches (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  project_id text not null references projects(id),
  match_score int not null,
  rationale text,
  created_at timestamptz not null default now()
);

create table submissions (
  id text primary key,
  opportunity_id text not null references opportunities(id),
  project_id text not null references projects(id),
  current_status text not null default 'Watch',
  owner text,
  external_submission_url text,
  manual_submit_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table submission_status_history (
  id text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  changed_by text not null,
  changed_at timestamptz not null default now(),
  note text
);

create table submission_assets (
  id text primary key,
  project_id text not null references projects(id),
  asset_name text not null,
  status text not null default '未開始',
  asset_url text,
  notes text,
  updated_at timestamptz not null default now()
);

create table source_registry (
  id text primary key,
  source_name text not null,
  url text not null,
  source_type text not null,
  scan_frequency text not null,
  last_checked timestamptz,
  last_successful_scan timestamptz,
  active boolean not null default true,
  notes text
);

create table reminders (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  label text not null,
  remind_at_utc timestamptz not null,
  sent_at timestamptz,
  unique(opportunity_id, label)
);

create table activity_logs (
  id text primary key,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create table import_jobs (
  id text primary key,
  source_file_name text not null,
  mode text not null,
  status text not null,
  created_at timestamptz not null default now(),
  imported_at timestamptz,
  success_count int not null default 0,
  update_count int not null default 0,
  skip_count int not null default 0,
  error_count int not null default 0
);

create table import_job_rows (
  id text primary key,
  import_job_id text not null references import_jobs(id) on delete cascade,
  row_number int not null,
  dedupe_key text,
  action text not null,
  error text,
  raw_row jsonb not null
);
