-- شغل الكود ده في Supabase -> SQL Editor -> Run (مرة واحدة بس)

-- تكبيس المدارس: كل ضغطة = سطر جديد (بيمنع أي تعارض لو ناس كتير ضغطوا في نفس اللحظة)
create table if not exists cheer_taps (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_cheer_taps_school on cheer_taps (school);
create index if not exists idx_cheer_taps_user on cheer_taps (user_id);

-- مؤشر أونلاين: آخر ظهور لكل مستخدم
alter table users add column if not exists last_seen_at timestamptz;

-- المتجر: العناصر المتاحة للشراء بالكوينات
create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cost integer not null,
  type text not null, -- 'title' أو 'frame_color'
  value text not null, -- نص اللقب أو كود اللون
  created_at timestamptz not null default now()
);

-- مشتريات المستخدمين
create table if not exists user_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_id uuid not null references shop_items(id) on delete cascade,
  active boolean not null default false,
  purchased_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists idx_purchases_user on user_purchases (user_id);

-- عناصر افتراضية للمتجر (تقدر تضيف/تمسح منهم بعدين من الأدمن)
insert into shop_items (name, description, cost, type, value)
select * from (values
  ('نجم الفصل ⭐', 'لقب مميز يظهر جنب اسمك', 30, 'title', 'نجم الفصل'),
  ('الأسطورة الصغيرة 🐉', 'لقب مميز يظهر جنب اسمك', 50, 'title', 'الأسطورة الصغيرة'),
  ('ملك اللعب 🎮', 'لقب مميز يظهر جنب اسمك', 40, 'title', 'ملك اللعب'),
  ('إطار أحمر', 'إطار ملون حوالين صورتك', 35, 'frame_color', '#ff6b6b'),
  ('إطار أزرق', 'إطار ملون حوالين صورتك', 35, 'frame_color', '#7c9cf0'),
  ('إطار بنفسجي', 'إطار ملون حوالين صورتك', 35, 'frame_color', '#b98af5')
) as v(name, description, cost, type, value)
where not exists (select 1 from shop_items);
