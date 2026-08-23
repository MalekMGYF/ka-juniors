-- مافيوسو: شغّل الملف كاملًا مرة واحدة في Supabase SQL Editor ثم اضغط Run.
-- يضيف صعوبة القضايا، تفضيل الصعوبة للروم، وإعادة لعب سريعة لنفس المجموعة.

alter table mafioso_cases add column if not exists difficulty text;
update mafioso_cases set difficulty = 'medium' where difficulty is null;
alter table mafioso_cases alter column difficulty set default 'medium';
alter table mafioso_cases alter column difficulty set not null;
alter table mafioso_cases drop constraint if exists mafioso_cases_difficulty_check;
alter table mafioso_cases add constraint mafioso_cases_difficulty_check check (difficulty in ('easy', 'medium', 'hard'));

alter table mafioso_rooms add column if not exists difficulty_preference text;
update mafioso_rooms set difficulty_preference = 'any' where difficulty_preference is null;
alter table mafioso_rooms alter column difficulty_preference set default 'any';
alter table mafioso_rooms alter column difficulty_preference set not null;
alter table mafioso_rooms drop constraint if exists mafioso_rooms_difficulty_preference_check;
alter table mafioso_rooms add constraint mafioso_rooms_difficulty_preference_check check (difficulty_preference in ('any', 'easy', 'medium', 'hard'));

alter table mafioso_rooms add column if not exists rematch_room_code text;
alter table mafioso_room_players add column if not exists rematch_ready_at timestamptz;

create index if not exists idx_mafioso_cases_active_difficulty
  on mafioso_cases(is_active, player_count, difficulty, created_at desc);
create index if not exists idx_mafioso_rooms_rematch
  on mafioso_rooms(rematch_room_code) where rematch_room_code is not null;
