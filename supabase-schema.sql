-- شغل الكود ده في Supabase -> SQL Editor -> Run

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text not null unique,
  instagram_username text,
  school text not null check (school in ('مدرسة كمال عامر', 'مدرسة سامح سيف اليزل', 'مدرسة عمر سليمان')),
  password_hash text not null,
  points integer not null default 0,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  answer_name text not null,
  hint text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists guesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists hint_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists idx_users_points on users (points desc);
create index if not exists idx_guesses_user on guesses (user_id);
