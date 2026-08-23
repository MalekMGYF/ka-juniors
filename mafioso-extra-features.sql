-- مافيوسو: ميزات إضافية اختيارية
-- شغّل الملف مرة واحدة في Supabase SQL Editor.
-- لا يحذف بيانات أو قضايا موجودة.

alter table mafioso_cases
  add column if not exists special_roles_enabled boolean not null default false;

alter table mafioso_case_roles
  add column if not exists special_ability text;

create table if not exists mafioso_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references mafioso_cases(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 5),
  event_text text not null check (char_length(trim(event_text)) between 1 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(case_id, round_number)
);

create table if not exists mafioso_room_suspicions (
  room_id uuid not null references mafioso_rooms(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 5),
  voter_id uuid not null references users(id) on delete cascade,
  target_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, round_number, voter_id),
  check (voter_id <> target_id)
);

create table if not exists mafioso_inspections (
  room_id uuid not null references mafioso_rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  target_id uuid not null references users(id) on delete cascade,
  result_alignment text not null check (result_alignment in ('mafia', 'innocent')),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id),
  check (user_id <> target_id)
);

create table if not exists mafioso_daily_mission_claims (
  user_id uuid not null references users(id) on delete cascade,
  mission_key text not null,
  mission_date date not null default current_date,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_key, mission_date)
);

alter table mafioso_case_events enable row level security;
alter table mafioso_room_suspicions enable row level security;
alter table mafioso_inspections enable row level security;
alter table mafioso_daily_mission_claims enable row level security;

create index if not exists idx_mafioso_events_case_round on mafioso_case_events(case_id, round_number);
create index if not exists idx_mafioso_suspicions_room_round on mafioso_room_suspicions(room_id, round_number);
create index if not exists idx_mafioso_inspections_room on mafioso_inspections(room_id, user_id);
