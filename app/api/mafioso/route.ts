import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { broadcastMafiosoEvent } from "../../../lib/mafioso-realtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PLAYER_COUNT = 5;
const ROLE_REVEAL_SECONDS = 60;
const MIN_ROLE_READ_SECONDS = 5;
const BOSS_INTRO_SECONDS = 15;
const CLUE_ANNOUNCE_SECONDS = 10;
const DISCUSSION_SECONDS = 300;
const VOTE_ANNOUNCE_SECONDS = 5;
const VOTE_SECONDS = 75;
const VOTE_RESULT_SECONDS = 5;
const FINISH_REVEAL_SECONDS = 10;

type Db = ReturnType<typeof supabaseServer>;
type Room = {
  id: string; code: string; case_id: string | null; status: string; round_number: number;
  phase_ends_at: string | null; current_clue_id: string | null; created_by: string | null;
  final_winner: "mafia" | "innocent" | null; last_eliminated_user_id: string | null;
  last_eliminated_alignment: "mafia" | "innocent" | null;
};
type Member = { user_id: string; role_id: string | null; alignment: "mafia" | "innocent" | null; status: "active" | "eliminated" | "left"; is_connected: boolean; role_acknowledged_at: string | null; discussion_ready_round: number | null };

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `MF-${Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")}`;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function inSeconds(seconds: number) { return new Date(Date.now() + seconds * 1000).toISOString(); }
function unavailable(error?: unknown) {
  console.error("mafioso request failed", error);
  return noStoreJson({ configured: false, error: "حصلت مشكلة في غرفة القضية. جرّب تاني بعد ثواني." }, { status: 500 });
}

async function getMembers(supabase: Db, roomId: string) {
  const { data, error } = await supabase.from("mafioso_room_players").select("user_id, role_id, alignment, status, is_connected, role_acknowledged_at, discussion_ready_round").eq("room_id", roomId).order("joined_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Member[];
}

async function getRoom(supabase: Db, code: string) {
  const { data, error } = await supabase.from("mafioso_rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

async function getCaseRoles(supabase: Db, caseId: string) {
  const { data, error } = await supabase.from("mafioso_case_roles").select("id, role_name, public_motive, private_card_text, alignment, sort_order").eq("case_id", caseId).order("sort_order");
  if (error) throw error;
  return data || [];
}

async function getClue(supabase: Db, room: Room) {
  if (!room.case_id) throw new Error("missing case");
  const { data, error } = await supabase.from("mafioso_case_clues").select("id, clue_text").eq("case_id", room.case_id).eq("round_number", room.round_number).maybeSingle();
  if (error || !data) throw new Error("missing clue");
  return data;
}

async function startBossIntro(supabase: Db, room: Room) {
  const endsAt = inSeconds(BOSS_INTRO_SECONDS);
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "boss_intro", phase_ends_at: endsAt }).eq("id", room.id).eq("status", "role_reveal").select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "boss_intro_started", { endsAt });
}

async function startClueReveal(supabase: Db, room: Room) {
  const clue = await getClue(supabase, room);
  const endsAt = inSeconds(CLUE_ANNOUNCE_SECONDS);
  const allowedStatuses = room.status === "boss_intro" ? ["boss_intro"] : ["vote_result"];
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "clue_reveal", current_clue_id: clue.id, phase_ends_at: endsAt }).eq("id", room.id).in("status", allowedStatuses).select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "clue_announced", { roundNumber: room.round_number, clue: clue.clue_text, endsAt });
}

async function startDiscussion(supabase: Db, room: Room) {
  const endsAt = inSeconds(DISCUSSION_SECONDS);
  const { error: resetError } = await supabase.from("mafioso_room_players").update({ discussion_ready_round: null }).eq("room_id", room.id);
  if (resetError) throw resetError;
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "discussion", phase_ends_at: endsAt }).eq("id", room.id).eq("status", "clue_reveal").select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "discussion_started", { roundNumber: room.round_number, endsAt });
}

async function startVoteAnnouncement(supabase: Db, room: Room, isFinal = false) {
  const endsAt = inSeconds(VOTE_ANNOUNCE_SECONDS);
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "vote_announcement", phase_ends_at: endsAt }).eq("id", room.id).in("status", ["discussion", "vote_result"]).select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "vote_announcement_started", { roundNumber: room.round_number, endsAt, isFinal });
}

async function startVoting(supabase: Db, room: Room, isFinal = false) {
  const endsAt = inSeconds(VOTE_SECONDS);
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "voting", phase_ends_at: endsAt }).eq("id", room.id).eq("status", "vote_announcement").select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "voting_started", { roundNumber: room.round_number, endsAt, isFinal });
}

async function finishRoom(supabase: Db, room: Room, winner: "mafia" | "innocent", eliminatedId?: string) {
  const endsAt = inSeconds(FINISH_REVEAL_SECONDS);
  const { data, error } = await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: winner, phase_ends_at: endsAt }).eq("id", room.id).in("status", ["vote_result", "voting"]).select("id").maybeSingle();
  if (error) throw error;
  if (data) await broadcastMafiosoEvent(supabase, room.code, "game_finished", { winner, eliminatedId: eliminatedId || null, endsAt });
}

function eligibleVoters(members: Member[]) {
  const active = members.filter((player) => player.status === "active");
  if (active.length > 2) return active.map((player) => player.user_id);
  return members.filter((player) => player.status === "active" || (player.status === "eliminated" && player.alignment === "innocent")).map((player) => player.user_id);
}

async function resolveVotes(supabase: Db, room: Room) {
  const members = await getMembers(supabase, room.id);
  const activeBefore = members.filter((player) => player.status === "active");
  const eligible = eligibleVoters(members);
  const { data: votes, error: votesError } = await supabase.from("mafioso_votes").select("voter_id, target_id").eq("room_id", room.id).eq("round_number", room.round_number);
  if (votesError) throw votesError;
  const counts = new Map<string, number>();
  for (const vote of votes || []) if (eligible.includes(vote.voter_id)) counts.set(vote.target_id, (counts.get(vote.target_id) || 0) + 1);
  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const isTie = !ranked.length || (ranked.length > 1 && ranked[0][1] === ranked[1][1]);
  const eliminated = isTie ? undefined : activeBefore.find((player) => player.user_id === ranked[0][0]);
  const endsAt = inSeconds(VOTE_RESULT_SECONDS);
  const { data: claimed, error: claimError } = await supabase.from("mafioso_rooms").update({ status: "vote_result", phase_ends_at: endsAt, last_eliminated_user_id: eliminated?.user_id || null, last_eliminated_alignment: eliminated?.alignment || null }).eq("id", room.id).eq("status", "voting").select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return;
  if (eliminated) {
    const { error } = await supabase.from("mafioso_room_players").update({ status: "eliminated" }).eq("room_id", room.id).eq("user_id", eliminated.user_id).eq("status", "active");
    if (error) throw error;
  }
  await broadcastMafiosoEvent(supabase, room.code, "vote_resolved", { eliminatedId: eliminated?.user_id || null, eliminatedWasMafia: eliminated?.alignment === "mafia", isTie, endsAt });
}

async function continueAfterVoteResult(supabase: Db, room: Room) {
  const members = await getMembers(supabase, room.id);
  const active = members.filter((player) => player.status === "active");
  const mafiaRemaining = active.filter((player) => player.alignment === "mafia");
  const innocentRemaining = active.filter((player) => player.alignment === "innocent");
  if (!mafiaRemaining.length) return finishRoom(supabase, room, "innocent", room.last_eliminated_user_id || undefined);
  if (!innocentRemaining.length || room.round_number >= 5 || room.round_number >= 4) return finishRoom(supabase, room, "mafia", room.last_eliminated_user_id || undefined);
  if (active.length <= 2) {
    const finalRound = room.round_number + 1;
    const { data, error } = await supabase.from("mafioso_rooms").update({ round_number: finalRound, current_clue_id: null, status: "vote_announcement", phase_ends_at: inSeconds(VOTE_ANNOUNCE_SECONDS) }).eq("id", room.id).eq("status", "vote_result").select("id").maybeSingle();
    if (error) throw error;
    if (data) await broadcastMafiosoEvent(supabase, room.code, "vote_announcement_started", { roundNumber: finalRound, endsAt: inSeconds(VOTE_ANNOUNCE_SECONDS), isFinal: true });
    return;
  }
  const nextRoom = { ...room, round_number: room.round_number + 1 };
  const { data, error } = await supabase.from("mafioso_rooms").update({ round_number: nextRoom.round_number, current_clue_id: null }).eq("id", room.id).eq("status", "vote_result").select("id").maybeSingle();
  if (error) throw error;
  if (data) await startClueReveal(supabase, nextRoom);
}

async function advanceIfNeeded(supabase: Db, room: Room) {
  if (!room.phase_ends_at || new Date(room.phase_ends_at).getTime() > Date.now()) return false;
  if (room.status === "role_reveal") { await startBossIntro(supabase, room); return true; }
  if (room.status === "boss_intro") { await startClueReveal(supabase, room); return true; }
  if (room.status === "clue_reveal") { await startDiscussion(supabase, room); return true; }
  if (room.status === "discussion") { await startVoteAnnouncement(supabase, room); return true; }
  if (room.status === "vote_announcement") { await startVoting(supabase, room, room.round_number === 5); return true; }
  if (room.status === "voting") { await resolveVotes(supabase, room); return true; }
  if (room.status === "vote_result") { await continueAfterVoteResult(supabase, room); return true; }
  return false;
}

export async function GET(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  const wantsOpenRooms = request.nextUrl.searchParams.get("openRooms") === "1";
  if (wantsOpenRooms) {
    try {
      const supabase = supabaseServer();
      const { data: waitingRooms, error: roomsError } = await supabase.from("mafioso_rooms").select("id, code, created_by, created_at").eq("status", "waiting").order("created_at", { ascending: false }).limit(30);
      if (roomsError) throw roomsError;
      const roomIds = (waitingRooms || []).map((room) => room.id);
      if (!roomIds.length) return noStoreJson({ rooms: [] });
      const { data: roomPlayers, error: playersError } = await supabase.from("mafioso_room_players").select("room_id, user_id, is_connected, status, users(nickname)").in("room_id", roomIds);
      if (playersError) throw playersError;
      const connectedByRoom = new Map<string, any[]>();
      for (const player of roomPlayers || []) if (player.is_connected && player.status === "active") connectedByRoom.set(player.room_id, [...(connectedByRoom.get(player.room_id) || []), player]);
      const emptyRoomIds = roomIds.filter((roomId) => !(connectedByRoom.get(roomId) || []).length);
      if (emptyRoomIds.length) await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: null, phase_ends_at: new Date().toISOString() }).in("id", emptyRoomIds).eq("status", "waiting");
      return noStoreJson({ rooms: (waitingRooms || []).map((room) => {
        const connected = connectedByRoom.get(room.id) || [];
        const host = connected.find((player) => player.user_id === room.created_by);
        return { code: room.code, hostNickname: host?.users?.nickname || "صاحب الروم", playerCount: connected.length, seatsLeft: Math.max(0, PLAYER_COUNT - connected.length) };
      }).filter((room) => room.playerCount > 0 && room.playerCount < PLAYER_COUNT) });
    } catch (error) { return unavailable(error); }
  }
  if (!code) return noStoreJson({ configured: true, room: null, players: [], messages: [], sessionUserId: session.userId });
  try {
    const supabase = supabaseServer();
    let room = await getRoom(supabase, code);
    if (!room) return noStoreJson({ configured: true, room: null, players: [], messages: [], sessionUserId: session.userId });
    if (await advanceIfNeeded(supabase, room)) room = await getRoom(supabase, code);
    if (!room) return noStoreJson({ configured: true, room: null, players: [], messages: [], sessionUserId: session.userId });
    const [members, usersResult, messagesResult, caseResult, rolesResult, clueResult, votesResult] = await Promise.all([
      getMembers(supabase, room.id),
      supabase.from("mafioso_room_players").select("user_id, users(nickname, avatar_url)").eq("room_id", room.id),
      supabase.from("mafioso_messages").select("id, user_id, body, created_at, users(nickname)").eq("room_id", room.id).order("created_at").limit(120),
      room.case_id ? supabase.from("mafioso_cases").select("title, subtitle, briefing, reveal_title, reveal_story, reveal_audio_path").eq("id", room.case_id).maybeSingle() : Promise.resolve({ data: null } as any),
      room.case_id ? getCaseRoles(supabase, room.case_id) : Promise.resolve([]),
      room.current_clue_id ? supabase.from("mafioso_case_clues").select("clue_text").eq("id", room.current_clue_id).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from("mafioso_votes").select("target_id").eq("room_id", room.id).eq("round_number", room.round_number)
    ]);
    const me = members.find((member) => member.user_id === session.userId);
    const userMap = new Map(((usersResult.data || []) as any[]).map((row) => [row.user_id, row.users]));
    const roleMap = new Map((rolesResult as any[]).map((role) => [role.id, role]));
    const voteCounts = new Map<string, number>();
    for (const vote of (votesResult.data || []) as any[]) voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1);
    const ownRole = me?.role_id ? roleMap.get(me.role_id) : null;
    const hasPublicRoles = room.status !== "waiting";
    const publicPlayerNames = new Map(members.map((member) => {
      const nickname = (userMap.get(member.user_id) as any)?.nickname || "لاعب";
      const roleName = hasPublicRoles && member.role_id ? roleMap.get(member.role_id)?.role_name || null : null;
      return [member.user_id, roleName ? `${roleName} ${nickname}` : nickname];
    }));
    const lastEliminatedName = room.last_eliminated_user_id ? publicPlayerNames.get(room.last_eliminated_user_id) || "اللاعب" : null;
    const mafiaLeft = members.filter((member) => member.status === "active" && member.alignment === "mafia").length;
    return noStoreJson({
      configured: true,
      sessionUserId: session.userId,
      room: { ...room, isHost: room.created_by === session.userId },
      case: caseResult.data ? { title: caseResult.data.title, subtitle: caseResult.data.subtitle, briefing: caseResult.data.briefing, revealTitle: room.status === "finished" ? caseResult.data.reveal_title : null, revealStory: room.status === "finished" ? caseResult.data.reveal_story : null, revealAudioPath: room.status === "finished" && caseResult.data.reveal_audio_path ? supabase.storage.from("mafioso-media").getPublicUrl(caseResult.data.reveal_audio_path).data.publicUrl : null } : null,
      players: members.map((member) => {
        const nickname = (userMap.get(member.user_id) as any)?.nickname || "لاعب";
        const publicRoleName = hasPublicRoles && member.role_id ? roleMap.get(member.role_id)?.role_name || null : null;
        const revealedAlignment = member.status === "eliminated" || room.status === "finished" ? member.alignment : null;
        return { userId: member.user_id, nickname, displayName: publicRoleName ? `${publicRoleName} ${nickname}` : nickname, publicRoleName, revealedAlignment, avatarUrl: (userMap.get(member.user_id) as any)?.avatar_url || null, status: member.status, isConnected: member.is_connected, isYou: member.user_id === session.userId, voteCount: voteCounts.get(member.user_id) || 0, isReadyForVote: room.status === "discussion" && member.status === "active" && member.discussion_ready_round === room.round_number };
      }),
      motives: (rolesResult as any[]).map((role) => ({ roleName: role.role_name, motive: role.public_motive })),
      ownCard: ownRole ? { roleName: ownRole.role_name, cardText: ownRole.alignment === "mafia" ? "أنت من فريق المافيوسو. خليك هادي وما تكشفش انتماءك." : "أنت من فريق البريئين. ركّز في كلام مافيا بوص والأدلة." , alignment: ownRole.alignment, acknowledged: Boolean(me?.role_acknowledged_at) } : null,
      currentClue: (clueResult as any).data?.clue_text || null,
      lastVote: { eliminatedName: lastEliminatedName, alignment: room.last_eliminated_alignment, mafiaLeft, isTie: !room.last_eliminated_user_id },
      messages: (messagesResult.data || []).map((message: any) => ({ id: message.id, userId: message.user_id, body: message.body, createdAt: message.created_at, author: publicPlayerNames.get(message.user_id) || message.users?.nickname || "لاعب" })),
      canChat: room.status === "discussion" && me?.status === "active",
      discussionReady: {
        readyCount: members.filter((member) => member.status === "active" && member.discussion_ready_round === room.round_number).length,
        requiredCount: members.filter((member) => member.status === "active").length,
        isYouReady: room.status === "discussion" && me?.status === "active" && me.discussion_ready_round === room.round_number,
        canRequestVote: room.status === "discussion" && me?.status === "active"
      },
      canVote: room.status === "voting" && Boolean(me) && eligibleVoters(members).includes(session.userId),
      hasVoted: Boolean((await supabase.from("mafioso_votes").select("id").eq("room_id", room.id).eq("round_number", room.round_number).eq("voter_id", session.userId).maybeSingle()).data)
    });
  } catch (error) { return unavailable(error); }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  try {
    const supabase = supabaseServer();
    if (action === "create_room") {
      let room: any = null;
      for (let attempt = 0; attempt < 4 && !room; attempt += 1) {
        const created = await supabase.from("mafioso_rooms").insert({ code: roomCode(), created_by: session.userId, name: "غرفة القضية", status: "waiting" }).select("id, code").maybeSingle();
        if (!created.error) room = created.data;
      }
      if (!room) return unavailable();
      const { error } = await supabase.from("mafioso_room_players").insert({ room_id: room.id, user_id: session.userId, is_connected: true });
      if (error) return unavailable(error);
      await broadcastMafiosoEvent(supabase, room.code, "player_joined", { userId: session.userId, nickname: session.nickname });
      return noStoreJson({ ok: true, code: room.code, roomId: room.id, isHost: true });
    }
    if (!code) return noStoreJson({ error: "اكتب كود الروم" }, { status: 400 });
    let room = await getRoom(supabase, code);
    if (!room) return noStoreJson({ error: "الروم دي مش موجودة" }, { status: 404 });
    if (await advanceIfNeeded(supabase, room)) room = await getRoom(supabase, code);
    if (!room) return unavailable();

    if (action === "join_room") {
      if (room.status !== "waiting") return noStoreJson({ error: "القضية بدأت بالفعل" }, { status: 409 });
      const members = await getMembers(supabase, room.id);
      const existing = members.find((member) => member.user_id === session.userId);
      if (!existing && members.filter((member) => member.is_connected).length >= PLAYER_COUNT) return noStoreJson({ error: "الروم كاملة — مافيوسو تحتاج 5 بالظبط" }, { status: 409 });
      const { error } = await supabase.from("mafioso_room_players").upsert({ room_id: room.id, user_id: session.userId, status: "active", is_connected: true, last_seen_at: new Date().toISOString() }, { onConflict: "room_id,user_id" });
      if (error) return unavailable(error);
      await broadcastMafiosoEvent(supabase, code, "player_joined", { userId: session.userId, nickname: session.nickname });
      return noStoreJson({ ok: true, code, isHost: room.created_by === session.userId });
    }

    const members = await getMembers(supabase, room.id);
    const me = members.find((member) => member.user_id === session.userId);
    if (!me) return noStoreJson({ error: "ادخل الروم الأول" }, { status: 403 });

    if (action === "close_room") {
      if (room.created_by !== session.userId) return noStoreJson({ error: "صاحب الروم بس هو اللي يقدر يقفلها" }, { status: 403 });
      if (room.status !== "waiting") return noStoreJson({ error: "الروم بدأت بالفعل ومينفعش تتقفل من الـLobby" }, { status: 409 });
      const now = new Date().toISOString();
      const { error: playersError } = await supabase.from("mafioso_room_players").update({ is_connected: false, status: "left", last_seen_at: now }).eq("room_id", room.id);
      if (playersError) return unavailable(playersError);
      const { error: roomError } = await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: null, phase_ends_at: now }).eq("id", room.id).eq("status", "waiting");
      if (roomError) return unavailable(roomError);
      await broadcastMafiosoEvent(supabase, code, "room_closed", { reason: "host_closed", closedBy: session.userId });
      return noStoreJson({ ok: true });
    }

    if (action === "start_game") {
      if (room.created_by !== session.userId) return noStoreJson({ error: "صاحب الروم هو اللي يبدأ" }, { status: 403 });
      if (room.status !== "waiting") return noStoreJson({ error: "اللعبة بدأت بالفعل" }, { status: 409 });
      const connected = members.filter((member) => member.is_connected && member.status === "active");
      if (connected.length !== PLAYER_COUNT) return noStoreJson({ error: "لازم تدخلوا 5 لاعبين بالظبط عشان تبدأ القضية" }, { status: 409 });
      const { data: cases, error: caseError } = await supabase.from("mafioso_cases").select("id").eq("is_active", true);
      if (caseError || !cases?.length) return noStoreJson({ error: "ضيف قضية مفعّلة من الأدمن الأول" }, { status: 409 });
      const selectedCase = cases[Math.floor(Math.random() * cases.length)];
      const roles = await getCaseRoles(supabase, selectedCase.id);
      if (roles.length !== PLAYER_COUNT || roles.filter((role: any) => role.alignment === "mafia").length !== 2 || roles.filter((role: any) => role.alignment === "innocent").length !== 3) return noStoreJson({ error: "القضية لازم يكون فيها 5 شخصيات: 2 مافيا و3 بريئين" }, { status: 409 });
      const clues = await supabase.from("mafioso_case_clues").select("id").eq("case_id", selectedCase.id);
      if ((clues.data || []).length < 4) return noStoreJson({ error: "القضية لازم يكون فيها 4 أدلة" }, { status: 409 });
      const shuffledRoles = shuffle(roles);
      const shuffledPlayers = shuffle(connected);
      const assigned = shuffledRoles.map((role: any, index) => ({ userId: shuffledPlayers[index]?.user_id, roleId: role.id, alignment: role.alignment }));
      if (new Set(assigned.map((item) => item.userId)).size !== PLAYER_COUNT) return unavailable();
      for (const assignment of assigned) {
        const { error } = await supabase.from("mafioso_room_players").update({ role_id: assignment.roleId, alignment: assignment.alignment, status: "active", is_connected: true, role_acknowledged_at: null, discussion_ready_round: null }).eq("room_id", room.id).eq("user_id", assignment.userId);
        if (error) return unavailable(error);
      }
      const endsAt = inSeconds(ROLE_REVEAL_SECONDS);
      const { data: started, error } = await supabase.from("mafioso_rooms").update({ case_id: selectedCase.id, status: "role_reveal", round_number: 1, phase_ends_at: endsAt, current_clue_id: null, final_winner: null, last_eliminated_user_id: null, last_eliminated_alignment: null }).eq("id", room.id).eq("status", "waiting").select("id").maybeSingle();
      if (error) return unavailable(error);
      if (!started) return noStoreJson({ error: "اللعبة بدأت بالفعل" }, { status: 409 });
      await broadcastMafiosoEvent(supabase, code, "game_started", { endsAt, minReadSeconds: MIN_ROLE_READ_SECONDS });
      return noStoreJson({ ok: true, endsAt });
    }

    if (action === "acknowledge_role") {
      if (room.status !== "role_reveal") return noStoreJson({ error: "مرحلة الكروت انتهت" }, { status: 409 });
      const minReadEndsAt = room.phase_ends_at ? new Date(room.phase_ends_at).getTime() - (ROLE_REVEAL_SECONDS - MIN_ROLE_READ_SECONDS) * 1000 : 0;
      if (Date.now() < minReadEndsAt) return noStoreJson({ error: "اقرأ كارتك 5 ثواني على الأقل قبل ما تكمل" }, { status: 409 });
      const { error } = await supabase.from("mafioso_room_players").update({ role_acknowledged_at: new Date().toISOString() }).eq("room_id", room.id).eq("user_id", session.userId);
      if (error) return unavailable(error);
      const fresh = await getMembers(supabase, room.id);
      if (fresh.filter((player) => player.status === "active").every((player) => player.role_acknowledged_at)) await startBossIntro(supabase, room);
      else await broadcastMafiosoEvent(supabase, code, "role_acknowledged", { userId: session.userId });
      return noStoreJson({ ok: true });
    }

    if (action === "advance_phase") {
      await advanceIfNeeded(supabase, room);
      return noStoreJson({ ok: true });
    }

    if (action === "message") {
      if (room.status !== "discussion" || me.status !== "active") return noStoreJson({ error: "الشات متاح للاعبين الموجودين أثناء النقاش فقط" }, { status: 403 });
      const message = typeof body.message === "string" ? body.message.trim().slice(0, 420) : "";
      if (!message) return noStoreJson({ error: "اكتب رسالتك" }, { status: 400 });
      const { data: inserted, error } = await supabase.from("mafioso_messages").insert({ room_id: room.id, round_number: room.round_number, user_id: session.userId, body: message }).select("id, created_at").single();
      if (error || !inserted) return unavailable(error);
      await broadcastMafiosoEvent(supabase, code, "message_created", { id: inserted.id, userId: session.userId, author: session.nickname, body: message, createdAt: inserted.created_at });
      return noStoreJson({ ok: true, messageId: inserted.id });
    }

    if (action === "ready_for_vote") {
      if (room.status !== "discussion") return noStoreJson({ error: "الزر ده متاح أثناء النقاش فقط" }, { status: 409 });
      if (me.status !== "active") return noStoreJson({ error: "اللاعبين اللي لسه في القضية بس يقدروا يجهزوا للتصويت" }, { status: 403 });
      const { data: updated, error } = await supabase.from("mafioso_room_players").update({ discussion_ready_round: room.round_number }).eq("room_id", room.id).eq("user_id", session.userId).eq("status", "active").select("user_id").maybeSingle();
      if (error || !updated) return unavailable(error);
      const fresh = await getMembers(supabase, room.id);
      const activePlayers = fresh.filter((player) => player.status === "active");
      const allReady = activePlayers.length > 0 && activePlayers.every((player) => player.discussion_ready_round === room.round_number);
      await broadcastMafiosoEvent(supabase, code, "vote_ready_changed", { userId: session.userId, roundNumber: room.round_number, readyCount: activePlayers.filter((player) => player.discussion_ready_round === room.round_number).length, requiredCount: activePlayers.length });
      if (allReady) await startVoteAnnouncement(supabase, room);
      return noStoreJson({ ok: true, allReady });
    }

    if (action === "vote") {
      if (room.status !== "voting") return noStoreJson({ error: "التصويت مش مفتوح دلوقتي" }, { status: 409 });
      const liveMembers = await getMembers(supabase, room.id);
      if (!eligibleVoters(liveMembers).includes(session.userId)) return noStoreJson({ error: "أنت متفرج ومش مؤهل للتصويت في الجولة دي" }, { status: 403 });
      const targetId = typeof body.targetId === "string" ? body.targetId : "";
      if (targetId === session.userId) return noStoreJson({ error: "مينفعش تصوّت على نفسك" }, { status: 400 });
      if (!liveMembers.some((player) => player.user_id === targetId && player.status === "active")) return noStoreJson({ error: "اختار لاعب لسه جوه القضية" }, { status: 400 });
      const { error } = await supabase.from("mafioso_votes").insert({ room_id: room.id, round_number: room.round_number, voter_id: session.userId, target_id: targetId });
      if (error) return noStoreJson({ error: /unique/i.test(error.message) ? "أنت صوتت مرة بالفعل في الجولة دي" : "حصل خطأ في التصويت" }, { status: 409 });
      const fresh = await getMembers(supabase, room.id);
      const eligible = eligibleVoters(fresh);
      const { count } = await supabase.from("mafioso_votes").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("round_number", room.round_number);
      await broadcastMafiosoEvent(supabase, code, "vote_cast", { voterId: session.userId, targetId });
      if ((count || 0) >= eligible.length) await resolveVotes(supabase, room);
      return noStoreJson({ ok: true });
    }

    if (action === "leave_room") {
      const { error } = await supabase.from("mafioso_room_players").update({ is_connected: false, status: room.status === "waiting" ? "left" : me.status, last_seen_at: new Date().toISOString() }).eq("room_id", room.id).eq("user_id", session.userId);
      if (error) return unavailable(error);
      const { count: connectedCount, error: countError } = await supabase.from("mafioso_room_players").select("user_id", { count: "exact", head: true }).eq("room_id", room.id).eq("is_connected", true);
      if (countError) return unavailable(countError);
      const mustCloseRoom = room.status !== "finished" && (room.status !== "waiting" || (connectedCount || 0) === 0);
      if (mustCloseRoom) {
        const { error: closeError } = await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: null, phase_ends_at: new Date().toISOString() }).eq("id", room.id).neq("status", "finished");
        if (closeError) return unavailable(closeError);
        await broadcastMafiosoEvent(supabase, code, "room_closed", { reason: room.status === "waiting" ? "empty" : "player_left" });
      }
      await broadcastMafiosoEvent(supabase, code, "player_left", { userId: session.userId });
      return noStoreJson({ ok: true });
    }
    return noStoreJson({ error: "عملية غير معروفة" }, { status: 400 });
  } catch (error) { return unavailable(error); }
}
