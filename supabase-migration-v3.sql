-- شغل الكود ده في Supabase -> SQL Editor -> Run (مرة واحدة بس)

-- استهداف مدرسة معينة لأسئلة خمن الطالب (فاضي = لكل المدارس)
alter table questions add column if not exists target_school text;

-- إعدادات جديدة للسؤال اليومي: مدرسة مستهدفة + حد أقصى للمجاوبين + وقت جدولة الظهور
alter table daily_questions add column if not exists target_school text;
alter table daily_questions add column if not exists max_answerers integer;
alter table daily_questions add column if not exists scheduled_at timestamptz not null default now();

-- جدول أحداث "آخر فايز" (ترقية مستوى / اتصدار الترتيب)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  user_id uuid references users(id) on delete cascade,
  payload text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_created on events (created_at desc);
