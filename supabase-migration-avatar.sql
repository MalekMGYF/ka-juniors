-- شغل الكود ده في Supabase -> SQL Editor -> Run (مرة واحدة بس)

alter table users add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
