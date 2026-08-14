-- =========================================================
-- تحدي المعلومات (Trivia) + ترتيب "مين الأذكي"
-- =========================================================

alter table users add column if not exists trivia_points integer not null default 0;

create table if not exists trivia_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null, -- array of 4 strings, e.g. ["اجابة1","اجابة2","اجابة3","اجابة4"]
  correct_index integer not null, -- 0..3
  is_active boolean not null default false,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists trivia_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references trivia_questions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  selected_index integer not null,
  is_correct boolean not null,
  answer_ms integer not null,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists idx_trivia_answers_question on trivia_answers (question_id);
create index if not exists idx_trivia_answers_user on trivia_answers (user_id);
create index if not exists idx_trivia_questions_active on trivia_questions (is_active);
