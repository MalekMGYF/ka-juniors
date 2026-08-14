// Style reminder: this route keeps the realtime payload small and deterministic so the UI can feel instant while Supabase remains the source of truth.

import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { broadcastPictionaryEvent } from "../../../lib/pictionary-realtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PLAYERS = 6;
const ROUND_SECONDS = 120;
const CORRECT_GUESS_POINTS = 3;
const CORRECT_GUESS_COINS = 2;

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `KJ-${Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")}`;
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("ar").replace(/[ًٌٍَُِّْـ]/g, "").replace(/\s+/g, " ");
}

async function randomWordOptions(supabase: ReturnType<typeof supabaseServer>) {
  const { data, error } = await supabase.from("pictionary_word_bank").select("word").eq("is_active", true);
  if (error) return { words: [], usesWordBank: true };
  const uniqueWords = Array.from(new Set((data || []).map((item) => item.word.trim()).filter(Boolean)));
  if (uniqueWords.length < 3) return { words: [], usesWordBank: true };
  for (let index = uniqueWords.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [uniqueWords[index], uniqueWords[randomIndex]] = [uniqueWords[randomIndex], uniqueWords[index]];
  }
  return { words: uniqueWords.slice(0, 3), usesWordBank: true };
}

function unavailable(error?: unknown) {
  return noStoreJson({ configured: false, error: error instanceof Error ? error.message : "شغّل ترحيل اللعبة في Supabase أولًا" });
}

export async function GET(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return noStoreJson({ configured: true, room: null, players: [], messages: [], strokes: [], sessionUserId: session.userId });

  try {
    const supabase = supabaseServer();
    const { data: room, error: roomError } = await supabase.from("pictionary_rooms").select("*").eq("code", code).maybeSingle();
    if (roomError) return unavailable(roomError);
    if (!room) return noStoreJson({ configured: true, room: null, players: [], messages: [], strokes: [] });

    const [{ data: players }, { data: messages }] = await Promise.all([
      supabase.from("pictionary_room_players").select("user_id, score, round_coins, is_connected, users(nickname)").eq("room_id", room.id).order("score", { ascending: false }),
      supabase.from("pictionary_messages").select("id, user_id, body, is_correct, created_at, users(nickname)").eq("room_id", room.id).order("created_at", { ascending: true }).limit(80)
    ]);
    let strokes: Array<{ id: number; points: unknown; color: string; brush_size: number; tool?: string; user_id: string; created_at: string }> = [];
    if (room.status === "drawing") {
      let strokeResult = await supabase.from("pictionary_strokes").select("id, points, color, brush_size, tool, user_id, created_at").eq("room_id", room.id).order("created_at", { ascending: true }).limit(500);
      if (strokeResult.error && /tool|schema cache|column/i.test(strokeResult.error.message || "")) {
        strokeResult = await supabase.from("pictionary_strokes").select("id, points, color, brush_size, user_id, created_at").eq("room_id", room.id).order("created_at", { ascending: true }).limit(500) as typeof strokeResult;
      }
      strokes = (strokeResult.data || []) as typeof strokes;
    }
    return noStoreJson({ configured: true, sessionUserId: session.userId, isDrawer: room.current_drawer_id === session.userId, room: { ...room, current_word: room.current_drawer_id === session.userId ? room.current_word : null, word_options: room.current_drawer_id === session.userId ? room.word_options : [] }, players: (players || []).map((player) => ({ ...player, isYou: player.user_id === session.userId, isDrawer: player.user_id === room.current_drawer_id })), messages: (messages || []).map((message) => ({ ...message, body: message.is_correct && message.user_id !== session.userId ? "✓ لاعب جاوب صح" : message.body })), strokes: (strokes || []).map((stroke) => ({ id: stroke.id, points: stroke.points, color: stroke.color, brushSize: stroke.brush_size, tool: stroke.tool || "brush", userId: stroke.user_id, createdAt: stroke.created_at })) });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  const requestedCode = typeof body?.code === "string" && body.code.trim() ? body.code.trim().toUpperCase() : "";

  try {
    const supabase = supabaseServer();

    if (action === "create_room") {
      let createdRoom: { id: string; code: string } | null = null;
      let lastCreateError = "تعذر إنشاء الروم";
      const requestedMaxRounds = Number(body.maxRounds);
      const maxRounds = Number.isInteger(requestedMaxRounds) && requestedMaxRounds >= 3 && requestedMaxRounds <= 10 ? requestedMaxRounds : 5;
      for (let attempt = 0; attempt < 4 && !createdRoom; attempt += 1) {
        const roomPayload = { code: makeRoomCode(), name: "غرفة الأصحاب", created_by: session.userId, current_drawer_id: session.userId, word_options: [], status: "waiting", max_players: MAX_PLAYERS, max_rounds: maxRounds };
        let created = await supabase.from("pictionary_rooms").insert(roomPayload).select("*").single();
        if (created.error && /max_players|schema cache|column/i.test(created.error.message || "")) {
          const legacyPayload = { ...roomPayload };
          delete (legacyPayload as Partial<typeof roomPayload>).max_players;
          created = await supabase.from("pictionary_rooms").insert(legacyPayload).select("*").single();
        }
        if (created.error) lastCreateError = created.error.message;
        if (!created.error && created.data) createdRoom = { id: created.data.id, code: created.data.code };
      }
      if (!createdRoom) return unavailable(lastCreateError);
      const joinedAt = new Date().toISOString();
      const joined = await supabase.from("pictionary_room_players").upsert({ room_id: createdRoom.id, user_id: session.userId, is_connected: true, last_seen_at: joinedAt }, { onConflict: "room_id,user_id" });
      if (joined.error) return unavailable(joined.error);
      await broadcastPictionaryEvent(supabase, createdRoom.code, "player_joined", { userId: session.userId, nickname: session.nickname, joinedAt });
      return noStoreJson({ ok: true, code: createdRoom.code, roomId: createdRoom.id, isHost: true, playerCount: 1, maxRounds });
    }

    const code = requestedCode;
    if (!code) return noStoreJson({ error: "اكتب كود الروم" }, { status: 400 });
    const { data: room, error: roomError } = await supabase.from("pictionary_rooms").select("*").eq("code", code).maybeSingle();
    if (roomError) return unavailable(roomError);
    if (!room) return noStoreJson({ error: "الروم دي مش موجودة، راجع الكود" }, { status: 404 });

    const joinedAt = new Date().toISOString();
    if (action === "join_room") {
      if (room.status !== "waiting") return noStoreJson({ error: "الجولة بدأت، ادخل روم جديدة" }, { status: 409 });
      const { data: existingMembership } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("user_id", session.userId).maybeSingle();
      if (!existingMembership) {
        const { count } = await supabase.from("pictionary_room_players").select("user_id", { count: "exact", head: true }).eq("room_id", room.id).eq("is_connected", true);
        if ((count || 0) >= (room.max_players || MAX_PLAYERS)) return noStoreJson({ error: "الروم كاملة — أقصى عدد 6 لاعبين" }, { status: 409 });
      }
      const joined = await supabase.from("pictionary_room_players").upsert({ room_id: room.id, user_id: session.userId, is_connected: true, last_seen_at: joinedAt }, { onConflict: "room_id,user_id" });
      if (joined.error) return unavailable(joined.error);
      await broadcastPictionaryEvent(supabase, code, "player_joined", { userId: session.userId, nickname: session.nickname, joinedAt });
      const { count } = await supabase.from("pictionary_room_players").select("user_id", { count: "exact", head: true }).eq("room_id", room.id).eq("is_connected", true);
      return noStoreJson({ ok: true, code, roomId: room.id, isHost: room.created_by === session.userId, playerCount: count || 0 });
    }

    const { data: membership } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("user_id", session.userId).maybeSingle();
    if (!membership) return noStoreJson({ error: "ادخل الروم الأول" }, { status: 403 });

    if (action === "start_game") {
      if (room.created_by !== session.userId) return noStoreJson({ error: "صاحب الروم هو اللي يبدأ" }, { status: 403 });
      if (room.status !== "waiting") return noStoreJson({ error: "الروم بدأت بالفعل" }, { status: 409 });
      const { data: lobbyPlayers } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("is_connected", true).order("joined_at", { ascending: true });
      if (!lobbyPlayers || lobbyPlayers.length < 3) return noStoreJson({ error: "لازم 3 لاعبين على الأقل عشان تبدأ" }, { status: 409 });
      const wordSelection = await randomWordOptions(supabase);
      if (wordSelection.usesWordBank && wordSelection.words.length < 3) return noStoreJson({ error: "ضيف 3 كلمات على الأقل في بنك كلمات ارسم واتقال من صفحة الأدمن" }, { status: 409 });
      const drawerId = lobbyPlayers[0].user_id;
      const { data: drawerUser } = await supabase.from("users").select("nickname").eq("id", drawerId).maybeSingle();
      const started = await supabase.from("pictionary_rooms").update({ status: "drawing", current_drawer_id: drawerId, current_word: null, word_options: wordSelection.words, round_number: 1, round_started_at: null, round_ends_at: null }).eq("id", room.id).eq("status", "waiting");
      if (started.error) return unavailable(started.error);
      await broadcastPictionaryEvent(supabase, code, "game_started", { drawerId, drawerName: drawerUser?.nickname || "الرسام", roundNumber: 1, maxRounds: room.max_rounds || 5, playerCount: lobbyPlayers.length, wordOptions: wordSelection.words });
      return noStoreJson({ ok: true, drawerId, playerCount: lobbyPlayers.length, maxRounds: room.max_rounds || 5 });
    }

    if (action === "expire_round") {
      if (room.current_drawer_id !== session.userId) return noStoreJson({ error: "الرسام الحالي هو اللي ينهي الوقت" }, { status: 403 });
      const { data: round } = await supabase.from("pictionary_rounds").select("id, chosen_word, winner_id").eq("room_id", room.id).eq("status", "drawing").order("round_number", { ascending: false }).limit(1).maybeSingle();
      if (round) {
        const isFinalRound = room.round_number >= (Number(room.max_rounds) || 5);
        await supabase.from("pictionary_rounds").update({ status: isFinalRound ? "finished" : "round_end" }).eq("id", round.id).eq("status", "drawing");
        await supabase.from("pictionary_rooms").update({ status: isFinalRound ? "finished" : "round_end", current_word: isFinalRound ? null : room.current_word, word_options: isFinalRound ? [] : room.word_options }).eq("id", room.id).eq("status", "drawing");
        if (isFinalRound) await broadcastPictionaryEvent(supabase, code, "game_finished", { roundNumber: room.round_number, maxRounds: Number(room.max_rounds) || 5, word: round.chosen_word, timedOut: true });
        else await broadcastPictionaryEvent(supabase, code, "round_ended", { roundId: round.id, winnerId: round.winner_id, winnerName: "", word: round.chosen_word, timedOut: true });
      }
      return noStoreJson({ ok: true });
    }

    if (action === "leave_room") {
      const left = await supabase.from("pictionary_room_players").update({ is_connected: false, last_seen_at: new Date().toISOString() }).eq("room_id", room.id).eq("user_id", session.userId);
      if (left.error) return unavailable(left.error);
      const { data: remaining } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("is_connected", true).order("joined_at", { ascending: true });
      if (!remaining?.length) await supabase.from("pictionary_rooms").update({ status: "finished" }).eq("id", room.id);
      else if (room.created_by === session.userId) await supabase.from("pictionary_rooms").update({ created_by: remaining[0].user_id }).eq("id", room.id);
      await broadcastPictionaryEvent(supabase, code, "player_left", { userId: session.userId, nickname: session.nickname });
      return noStoreJson({ ok: true });
    }

    if (action === "next_round") {
      if (room.created_by !== session.userId) return noStoreJson({ error: "صاحب الروم هو اللي يبدأ الجولة الجديدة" }, { status: 403 });
      const { data: lobbyPlayers } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("is_connected", true).order("joined_at", { ascending: true });
      if (!lobbyPlayers || lobbyPlayers.length < 3) return noStoreJson({ error: "لازم 3 لاعبين عشان نكمل" }, { status: 409 });
      const maxRounds = Math.min(10, Math.max(3, Number(room.max_rounds) || 5));
      if (room.round_number >= maxRounds) {
        const finished = await supabase.from("pictionary_rooms").update({ status: "finished", current_word: null, word_options: [] }).eq("id", room.id);
        if (finished.error) return unavailable(finished.error);
        await broadcastPictionaryEvent(supabase, code, "game_finished", { roundNumber: room.round_number, maxRounds });
        return noStoreJson({ ok: true, finished: true, roundNumber: room.round_number, maxRounds });
      }
      const wordSelection = await randomWordOptions(supabase);
      if (wordSelection.usesWordBank && wordSelection.words.length < 3) return noStoreJson({ error: "ضيف 3 كلمات على الأقل في بنك كلمات ارسم واتقال من صفحة الأدمن" }, { status: 409 });
      const currentIndex = Math.max(0, lobbyPlayers.findIndex((player) => player.user_id === room.current_drawer_id));
      const drawerId = lobbyPlayers[(currentIndex + 1) % lobbyPlayers.length].user_id;
      const roundNumber = room.round_number + 1;
      const { data: drawerUser } = await supabase.from("users").select("nickname").eq("id", drawerId).maybeSingle();
      await supabase.from("pictionary_rooms").update({ status: "drawing", current_drawer_id: drawerId, current_word: null, word_options: wordSelection.words, round_number: roundNumber, round_started_at: null, round_ends_at: null }).eq("id", room.id);
      await broadcastPictionaryEvent(supabase, code, "game_started", { drawerId, drawerName: drawerUser?.nickname || "الرسام", roundNumber, maxRounds, playerCount: lobbyPlayers.length, wordOptions: wordSelection.words });
      return noStoreJson({ ok: true, drawerId, roundNumber, maxRounds });
    }

    if (action === "choose_word") {
      if (room.current_drawer_id !== session.userId) return noStoreJson({ error: "الدور ده مش دورك" }, { status: 403 });
      const chosenWord = typeof body.word === "string" ? body.word.trim() : "";
      const roomWords = Array.isArray(room.word_options) ? room.word_options.filter((word): word is string => typeof word === "string") : [];
      if (!roomWords.includes(chosenWord)) return noStoreJson({ error: "اختار كلمة من الاختيارات" }, { status: 400 });
      const endsAt = new Date(Date.now() + ROUND_SECONDS * 1000).toISOString();
      const round = await supabase.from("pictionary_rounds").upsert({ room_id: room.id, round_number: room.round_number, drawer_id: session.userId, chosen_word: chosenWord, ends_at: endsAt, status: "drawing" }, { onConflict: "room_id,round_number" }).select("id").single();
      if (round.error) return unavailable(round.error);
      await supabase.from("pictionary_rooms").update({ status: "drawing", current_word: chosenWord, word_options: roomWords, round_started_at: new Date().toISOString(), round_ends_at: endsAt }).eq("id", room.id);
      await broadcastPictionaryEvent(supabase, code, "round_started", { roundId: round.data.id, drawerId: session.userId, drawerName: session.nickname, roundNumber: room.round_number, endsAt });
      return noStoreJson({ ok: true, roundId: round.data.id });
    }

    if (action === "message") {
      const message = typeof body.message === "string" ? body.message.trim().slice(0, 120) : "";
      if (!message) return noStoreJson({ error: "اكتب تخمينك الأول" }, { status: 400 });
      const { data: round } = await supabase.from("pictionary_rounds").select("id, chosen_word, winner_id, drawer_id").eq("room_id", room.id).eq("status", "drawing").order("round_number", { ascending: false }).limit(1).maybeSingle();
      const { data: alreadyCorrect } = round ? await supabase.from("pictionary_messages").select("id").eq("round_id", round.id).eq("user_id", session.userId).eq("is_correct", true).limit(1).maybeSingle() : { data: null };
      const isCorrect = Boolean(round && !alreadyCorrect && normalized(message) === normalized(round.chosen_word) && session.userId !== round.drawer_id);
      const insertedMessage = await supabase.from("pictionary_messages").insert({ room_id: room.id, round_id: round?.id || null, user_id: session.userId, body: message, is_guess: true, is_correct: isCorrect }).select("id, created_at").single();
      const messageError = insertedMessage.error;
      if (messageError) return unavailable(messageError);
      await broadcastPictionaryEvent(supabase, code, "message_created", { id: insertedMessage.data.id, userId: session.userId, author: session.nickname, body: isCorrect ? "" : message, isCorrect, hidden: isCorrect, createdAt: insertedMessage.data.created_at });
      let isRoundWinner = false;
      let awardedPoints = 0;
      let awardedCoins = 0;
      let allAnswered = false;
      let answerCount = 0;
      let eligibleCount = 0;
      if (isCorrect && round) {
        const points = CORRECT_GUESS_POINTS;
        const coins = CORRECT_GUESS_COINS;
        const { data: claimed } = await supabase.from("pictionary_rounds").update({ winner_id: session.userId, winner_points: points, winner_coins: coins }).eq("id", round.id).is("winner_id", null).select("id").maybeSingle();
        isRoundWinner = Boolean(claimed);
        awardedPoints = points;
        awardedCoins = coins;
        const { data: user } = await supabase.from("users").select("points, coins").eq("id", session.userId).single();
        if (user) await supabase.from("users").update({ points: (user.points || 0) + points, coins: (user.coins || 0) + coins }).eq("id", session.userId);
        const { data: roomPlayer } = await supabase.from("pictionary_room_players").select("score, round_coins").eq("room_id", room.id).eq("user_id", session.userId).maybeSingle();
        if (roomPlayer) await supabase.from("pictionary_room_players").update({ score: (roomPlayer.score || 0) + points, round_coins: (roomPlayer.round_coins || 0) + coins }).eq("room_id", room.id).eq("user_id", session.userId);
        await broadcastPictionaryEvent(supabase, code, "round_winner", { roundId: round.id, winnerId: session.userId, winnerName: session.nickname, points, coins, isFirst: isRoundWinner });
        const { data: activePlayers } = await supabase.from("pictionary_room_players").select("user_id").eq("room_id", room.id).eq("is_connected", true);
        const { data: correctAnswers } = await supabase.from("pictionary_messages").select("user_id").eq("round_id", round.id).eq("is_correct", true);
        const uniqueAnswers = new Set((correctAnswers || []).map((answer) => answer.user_id));
        eligibleCount = (activePlayers || []).filter((player) => player.user_id !== round.drawer_id).length;
        answerCount = (activePlayers || []).filter((player) => player.user_id !== round.drawer_id && uniqueAnswers.has(player.user_id)).length;
        allAnswered = eligibleCount > 0 && answerCount >= eligibleCount;
        if (allAnswered) {
          const isFinalRound = room.round_number >= (Number(room.max_rounds) || 5);
          await supabase.from("pictionary_rounds").update({ status: isFinalRound ? "finished" : "round_end" }).eq("id", round.id);
          await supabase.from("pictionary_rooms").update({ status: isFinalRound ? "finished" : "round_end", current_word: isFinalRound ? null : room.current_word, word_options: isFinalRound ? [] : room.word_options }).eq("id", room.id);
          if (isFinalRound) await broadcastPictionaryEvent(supabase, code, "game_finished", { roundNumber: room.round_number, maxRounds: Number(room.max_rounds) || 5, word: round.chosen_word, allAnswered: true });
          else await broadcastPictionaryEvent(supabase, code, "round_ended", { roundId: round.id, winnerId: round.winner_id || session.userId, winnerName: "الجميع جاوب", word: round.chosen_word, points, coins, allAnswered: true, answerCount, eligibleCount });
        }
      }
      return noStoreJson({ ok: true, messageId: insertedMessage.data.id, correct: isCorrect, isRoundWinner, points: awardedPoints, coins: awardedCoins, allAnswered, answerCount, eligibleCount });
    }

    if (action === "stroke") {
      if (room.current_drawer_id !== session.userId) return noStoreJson({ error: "الدور ده مش دورك" }, { status: 403 });
      const points = Array.isArray(body.points) ? body.points.slice(0, 120) : [];
      const { data: round } = await supabase.from("pictionary_rounds").select("id").eq("room_id", room.id).eq("status", "drawing").order("round_number", { ascending: false }).limit(1).maybeSingle();
      if (!round || points.length < 2) return noStoreJson({ error: "الخط مش جاهز" }, { status: 400 });
      const color = body.color || "#f5b942";
      const brushSize = Number(body.brushSize) || 8;
      const tool = body.tool === "eraser" ? "eraser" : "brush";
      let inserted = await supabase.from("pictionary_strokes").insert({ room_id: room.id, round_id: round.id, user_id: session.userId, points, color, brush_size: brushSize, tool }).select("id, created_at").single();
      if (inserted.error && /tool|schema cache|column/i.test(inserted.error.message || "")) {
        inserted = await supabase.from("pictionary_strokes").insert({ room_id: room.id, round_id: round.id, user_id: session.userId, points, color, brush_size: brushSize }).select("id, created_at").single();
      }
      if (inserted.error) return unavailable(inserted.error);
      await broadcastPictionaryEvent(supabase, code, "stroke_created", { id: inserted.data.id, userId: session.userId, points, color, brushSize, tool, createdAt: inserted.data.created_at });
      return noStoreJson({ ok: true });
    }

    return noStoreJson({ error: "عملية غير معروفة" }, { status: 400 });
  } catch (error) {
    return unavailable(error);
  }
}
