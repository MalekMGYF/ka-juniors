-- إصلاح التسجيل: اجعل حقل المدرسة يقبل المدارس الخمس الحالية، ومنها إبراهيم رفاعي وعمرو بن العاص.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.

do $$
declare
  constraint_row record;
begin
  -- حذف أي Check Constraint قديم يقيّد عمود school بقائمة المدارس القديمة فقط.
  for constraint_row in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'users'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%school%'
  loop
    execute format('alter table public.users drop constraint %I', constraint_row.conname);
  end loop;
end $$;

-- يعمل سواء كان النوع الحالي text أو enum قديم.
alter table public.users
  alter column school type text using school::text;

alter table public.users
  add constraint users_school_check
  check (school in (
    'مدرسة كمال عامر',
    'مدرسة سامح سيف اليزل',
    'مدرسة عمر سليمان',
    'مدرسة إبراهيم رفاعي',
    'مدرسة عمرو بن العاص'
  ));
