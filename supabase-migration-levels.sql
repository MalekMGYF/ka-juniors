-- شغل الكود ده في Supabase -> SQL Editor -> Run (مرة واحدة بس)

-- نقاط منفصلة للسؤال اليومي (عشان تتفصل عن نقاط خمن الطالب)
alter table users add column if not exists daily_points integer not null default 0;

-- جدول الأسئلة اليومية
create table if not exists daily_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- إجابات الطلاب على السؤال اليومي
create table if not exists daily_answers (
  id uuid primary key default gen_random_uuid(),
  daily_question_id uuid not null references daily_questions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  answer_text text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (daily_question_id, user_id)
);

create index if not exists idx_daily_answers_question on daily_answers (daily_question_id);
create index if not exists idx_daily_answers_user on daily_answers (user_id);
