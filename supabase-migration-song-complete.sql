-- لعبة كمل الأغنية: شغّل هذا الملف مرة واحدة في Supabase SQL Editor قبل رفع النسخة.

alter table public.users add column if not exists song_points integer not null default 0;

create table if not exists public.song_complete_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  prompt_text text not null check (char_length(trim(prompt_text)) between 3 and 500),
  full_line text not null check (char_length(trim(full_line)) between 3 and 700),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  intro_audio_path text,
  full_audio_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.song_complete_starts (
  question_id uuid not null references public.song_complete_questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table if not exists public.song_complete_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.song_complete_questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  selected_index smallint not null check (selected_index between -1 and 3),
  is_correct boolean not null,
  answer_ms integer not null check (answer_ms >= 0),
  points_earned smallint not null check (points_earned in (1, 5)),
  answered_at timestamptz not null default now(),
  unique(question_id, user_id)
);

create index if not exists song_complete_questions_active_created_idx on public.song_complete_questions(is_active, created_at);
create index if not exists song_complete_answers_user_idx on public.song_complete_answers(user_id);
create index if not exists song_complete_answers_question_idx on public.song_complete_answers(question_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-audio',
  'song-audio',
  true,
  5242880,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.song_complete_questions enable row level security;
alter table public.song_complete_starts enable row level security;
alter table public.song_complete_answers enable row level security;
-- جميع قراءة/كتابة اللعبة تمر عبر Route Handlers باستخدام service_role؛ لا تضف سياسات عامة للجداول.
