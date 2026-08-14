-- شغل الكود ده في Supabase -> SQL Editor -> Run (مرة واحدة بس)

create table if not exists trivia_starts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references trivia_questions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (question_id, user_id)
);
create index if not exists idx_trivia_starts_user on trivia_starts (user_id);
