-- مافيوسو: تشغيل هذا الملف مرة واحدة في Supabase SQL Editor.
-- يسجل رقم الجولة التي أكد فيها كل لاعب نشط أنه جاهز للانتقال للتصويت.
alter table mafioso_room_players
  add column if not exists discussion_ready_round integer;

create index if not exists idx_mafioso_players_discussion_ready
  on mafioso_room_players(room_id, discussion_ready_round);
