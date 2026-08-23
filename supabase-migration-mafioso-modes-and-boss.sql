-- مافيوسو: شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- يضيف وضع القضية (4 أو 5 لاعبين) وتأكيد كل لاعب لقصة مافيا بوص.
alter table mafioso_cases add column if not exists player_count integer;
update mafioso_cases set player_count = 5 where player_count is null;
alter table mafioso_cases alter column player_count set default 5;
alter table mafioso_cases alter column player_count set not null;
alter table mafioso_cases drop constraint if exists mafioso_cases_player_count_check;
alter table mafioso_cases add constraint mafioso_cases_player_count_check check (player_count in (4, 5));

alter table mafioso_room_players
  add column if not exists boss_intro_acknowledged_at timestamptz;

create index if not exists idx_mafioso_cases_player_count
  on mafioso_cases(is_active, player_count, created_at desc);
