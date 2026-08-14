-- شغل الملف ده كامل مرة واحدة في Supabase -> SQL Editor -> Run
-- بيضيف كل الجداول والأعمدة المطلوبة للميزات الجديدة (عداد الإطلاق، الدعوات، المزاد، لعبة الذاكرة، عجلة الحظ)

-- =========================================================
-- 1) صفحة الهبوط بعداد تنازلي يتحكم فيه الأدمن
-- =========================================================
create table if not exists site_settings (
  key text primary key,
  value text
);

-- =========================================================
-- 2) نظام دعوة الأصدقاء (Referral)
-- =========================================================
alter table users add column if not exists referral_code text;
create unique index if not exists idx_users_referral_code on users (referral_code);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references users(id) on delete cascade,
  referred_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create index if not exists idx_referrals_referrer on referrals (referrer_id);

-- =========================================================
-- 3) المزاد الأسبوعي
-- =========================================================
create table if not exists auctions (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  item_description text not null default '',
  end_time timestamptz not null,
  settled boolean not null default false,
  winner_user_id uuid references users(id) on delete set null,
  winning_amount integer,
  created_at timestamptz not null default now()
);

create table if not exists auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  amount integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auction_bids_auction on auction_bids (auction_id, amount desc);
create index if not exists idx_auctions_end_time on auctions (end_time desc);

-- =========================================================
-- 4) لعبة تحدي الذاكرة (Memory Match)
-- =========================================================
create table if not exists memory_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  played_at timestamptz not null default now()
);

create index if not exists idx_memory_plays_user on memory_plays (user_id, played_at desc);

-- =========================================================
-- 5) عجلة الحظ اليومية
-- =========================================================
create table if not exists wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reward integer not null default 0,
  spun_at timestamptz not null default now()
);

create index if not exists idx_wheel_spins_user on wheel_spins (user_id, spun_at desc);

-- =========================================================
-- كود دعوة فريد لكل المستخدمين الحاليين اللي معندهمش كود لسه
-- (لو الموقع شغال بالفعل وعنده مستخدمين قبل الميزة دي)
-- =========================================================
do $$
declare
  u record;
  new_code text;
begin
  for u in select id from users where referral_code is null loop
    loop
      new_code := upper(substr(md5(random()::text || u.id::text), 1, 6));
      exit when not exists (select 1 from users where referral_code = new_code);
    end loop;
    update users set referral_code = new_code where id = u.id;
  end loop;
end $$;
