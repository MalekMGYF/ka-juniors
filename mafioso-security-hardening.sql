-- مافيوسو: ترحيل تقوية أمان
-- شغّل الملف مرة واحدة في Supabase SQL Editor.
-- لا يحذف بيانات ولا يغيّر القضايا الموجودة.

-- منع التصويت على النفس حتى لو تم تجاوز الواجهة أو الـAPI.
alter table mafioso_votes
  drop constraint if exists mafioso_votes_not_self_check;
alter table mafioso_votes
  add constraint mafioso_votes_not_self_check
  check (voter_id <> target_id) not valid;

-- منع إدخال تصويت قديم أو غير مسموح به من أي مسار آخر.
create or replace function validate_mafioso_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_status text;
  current_round integer;
  active_count integer;
  voter_status text;
  voter_alignment text;
  target_status text;
begin
  if new.voter_id = new.target_id then
    raise exception 'mafioso_self_vote_not_allowed';
  end if;

  select status, round_number
    into room_status, current_round
    from mafioso_rooms
   where id = new.room_id;

  if room_status is distinct from 'voting' or new.round_number <> current_round then
    raise exception 'mafioso_vote_phase_invalid';
  end if;

  select status, alignment
    into voter_status, voter_alignment
    from mafioso_room_players
   where room_id = new.room_id and user_id = new.voter_id;

  select status
    into target_status
    from mafioso_room_players
   where room_id = new.room_id and user_id = new.target_id;

  select count(*)
    into active_count
    from mafioso_room_players
   where room_id = new.room_id and status = 'active';

  if active_count <= 2 then
    if voter_status is distinct from 'eliminated' or voter_alignment is distinct from 'innocent' then
      raise exception 'mafioso_final_vote_requires_eliminated_innocent';
    end if;
  elsif voter_status is distinct from 'active' then
    raise exception 'mafioso_vote_requires_active_player';
  end if;

  if target_status is distinct from 'active' then
    raise exception 'mafioso_target_must_be_active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_mafioso_vote on mafioso_votes;
create trigger trg_validate_mafioso_vote
before insert on mafioso_votes
for each row execute function validate_mafioso_vote();

-- منع تخطي سعة الروم بسبب طلبين متزامنين في نفس اللحظة.
create or replace function validate_mafioso_room_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_status text;
  max_players integer;
  connected_players integer;
begin
  if new.status <> 'active' or new.is_connected is not true then
    return new;
  end if;

  select status, player_count
    into room_status, max_players
    from mafioso_rooms
   where id = new.room_id
   for update;

  if room_status is distinct from 'waiting' then
    return new;
  end if;

  select count(*)
    into connected_players
    from mafioso_room_players
   where room_id = new.room_id
     and status = 'active'
     and is_connected = true
     and user_id <> new.user_id;

  if connected_players >= max_players then
    raise exception 'mafioso_room_full';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_mafioso_room_capacity on mafioso_room_players;
create trigger trg_validate_mafioso_room_capacity
before insert or update of status, is_connected on mafioso_room_players
for each row execute function validate_mafioso_room_capacity();

create index if not exists idx_mafioso_votes_room_round_voter
  on mafioso_votes(room_id, round_number, voter_id);
create index if not exists idx_mafioso_players_room_connected
  on mafioso_room_players(room_id, status, is_connected);
