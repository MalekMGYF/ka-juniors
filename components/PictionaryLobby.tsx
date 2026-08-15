// Style reminder: the lobby is a calm pre-game foyer—gold for ownership, mint for live presence, and no drawing UI until the room starts.

"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { pictionaryChannelName } from "../lib/pictionary-channel";

type Me = { nickname?: string } | null;
type LobbyPlayer = { id: string; name: string; initials: string; isYou?: boolean; isHost?: boolean };
type Props = { me: Me; onStarted: (room: { code: string; isHost: boolean }) => void };

const emptySlots: Array<undefined> = Array.from({ length: 6 }, () => undefined);

function mapPlayers(items: Array<{ user_id: string; isYou?: boolean; users?: { nickname?: string } | null }>) {
  return items.map((item) => {
    const name = item.users?.nickname || "لاعب";
    return { id: item.user_id, name, initials: name.trim().charAt(0) || "ل", isYou: item.isYou };
  });
}

export default function PictionaryLobby({ me, onStarted }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<{ code: string; isHost: boolean; maxRounds: number } | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [mode, setMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [maxRounds, setMaxRounds] = useState(5);
  const count = players.length;
  const ready = count >= 3;
  const displayPlayers = useMemo<Array<LobbyPlayer | undefined>>(() => [...players, ...emptySlots].slice(0, 6), [players]);

  const postLobby = async (action: string, code?: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pictionary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, code, ...extra }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || `حصلت مشكلة (${response.status})، جرّب تاني`); return null; }
      return data;
    } catch { setError("مش قادرين نوصل للسيرفر دلوقتي"); return null; }
    finally { setBusy(false); }
  };

  const readRoom = async (code: string) => {
    try {
      const response = await fetch(`/api/pictionary?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json();
      if (!data.room) return;
      if (typeof data.room.max_rounds === "number") setRoom((current) => current ? { ...current, maxRounds: data.room.max_rounds } : current);
      setPlayers(mapPlayers(data.players || []));
      if (data.room.status === "drawing") onStarted({ code, isHost: data.room.created_by === data.sessionUserId });
    } catch { /* Realtime remains the primary lobby update path. */ }
  };

  useEffect(() => {
    if (!room?.code) return;
    const client = getSupabaseBrowserClient();
    void readRoom(room.code);
    if (!client) return;
    const channel = client.channel(pictionaryChannelName(room.code), { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "player_joined" }, () => void readRoom(room.code));
    channel.on("broadcast", { event: "player_left" }, () => void readRoom(room.code));
    channel.on("broadcast", { event: "game_started" }, () => onStarted(room));
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { void client.removeChannel(channel); };
  }, [room?.code]);

  const createRoom = async () => {
    const data = await postLobby("create_room", undefined, { maxRounds });
    if (!data?.code) return;
    setRoomCode(data.code); setRoom({ code: data.code, isHost: true, maxRounds: Number(data.maxRounds) || maxRounds }); setPlayers([{ id: "you", name: me?.nickname || "أنت", initials: (me?.nickname || "أنت").charAt(0), isYou: true }]);
  };

  const joinRoom = async () => {
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) { setError("اكتب كود الروم الأول"); return; }
    const data = await postLobby("join_room", normalized);
    if (!data?.code) return;
    setRoomCode(normalized); setRoom({ code: normalized, isHost: Boolean(data.isHost), maxRounds: 5 });
    await readRoom(normalized);
  };

  const startGame = async () => {
    if (!room || !ready) return;
    const data = await postLobby("start_game", room.code);
    if (data?.ok) onStarted(room);
  };

  const copyCode = async () => {
    if (!roomCode) return;
    try { await navigator.clipboard.writeText(roomCode); setError("اتنسخ الكود — ابعته لأصحابك"); } catch { setError("الكود هو: " + roomCode); }
  };

  if (room) {
    return (
      <section className="pictionary-lobby-shell"><div className="pictionary-lobby">
        <div className="pictionary-lobby-head"><div><div className="pictionary-lobby-kicker">✦ غرفة أونلاين حقيقية</div><h1>استنوا بعض… وابدأوا</h1><p>ابعت الكود لأصحابك. اللعب لن يبدأ قبل ما يدخل 3 لاعبين، والروم تشيل لحد 6.</p></div><span className="pictionary-lobby-live"><i /> {live ? "متصلين لحظيًا" : "جاري الاتصال"}</span></div>
        <div className="pictionary-lobby-room"><div className="pictionary-lobby-room-top"><h2>كود الروم</h2><div className="pictionary-lobby-code">{roomCode}<button className="pictionary-lobby-copy" onClick={copyCode}>نسخ</button></div></div>
          <div className="pictionary-lobby-players">{displayPlayers.map((player, index) => player ? <div className="pictionary-lobby-player" key={player.id}><span className="pictionary-avatar" style={{ borderColor: player.isYou ? "#f5b942" : "#7ce0c0" }}>{player.initials}</span><b>{player.name}{player.isYou ? " (أنت)" : ""}</b><small>{index === 0 || (room.isHost && player.isYou) ? "صاحب الروم" : "جاهز"}</small></div> : <div className="pictionary-lobby-player empty" key={`empty-${index}`}><span>＋</span><small>مستنيين لاعب</small></div>)}</div>
          <div className="pictionary-lobby-actions"><span className="pictionary-lobby-count"><strong>{count}/6</strong> لاعبين دخلوا {ready ? "— الروم جاهزة" : "— محتاجين " + (3 - count) + " كمان"}</span><button className="pictionary-lobby-start" disabled={!room.isHost || !ready || busy} onClick={startGame}>{busy ? "بنبدأ…" : ready ? "ابدأ اللعبة" : "مستنيين 3 لاعبين"}</button></div>
          {error && <p className="pictionary-lobby-error">{error}</p>}
          <p className="pictionary-lobby-note">أنت {room.isHost ? "صاحب الروم — زر البدء عندك" : "داخل الروم — استنى صاحبها يبدأ"} · الروم دي {room.maxRounds} جولات · الكود يفضل شغال لحد ما الجولة تبدأ.</p>
        </div>
      </div></section>
    );
  }

  return (
    <section className="pictionary-lobby-shell"><div className="pictionary-lobby">
      <div className="pictionary-lobby-head"><div><div className="pictionary-lobby-kicker">✦ ارسم واتقال — أونلاين</div><h1>اعمل روم… واجمع صحابك</h1><p>واحد يرسم والباقي يخمنوا. كل لاعب يدخل بنفس الكود، والجولة تبدأ لما تكملوا 3.</p></div><span className="pictionary-lobby-live"><i /> غرف سريعة</span></div>
      <div className="pictionary-lobby-grid"><div className="pictionary-lobby-card pictionary-create-card"><div className="pictionary-create-badge">✦ أسرع طريقة للعب</div><h2><span className="pictionary-create-icon">✚</span> أنشئ روم جديدة</h2><p>هتاخد كود خاص وتبقى صاحب الروم. ابعته لصحابك واستناهم — لحد 6 لاعبين.</p><label className="pictionary-rounds-select"><span className="pictionary-rounds-copy"><b>عدد الجولات</b><small>اختار من 3 لـ10 جولات</small></span><span className="pictionary-rounds-control"><select value={maxRounds} onChange={(event) => setMaxRounds(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => index + 3).map((rounds) => <option value={rounds} key={rounds}>{rounds}</option>)}</select><em>جولات</em></span></label><button className="pictionary-lobby-primary pictionary-create-button" onClick={createRoom} disabled={busy}>{busy ? "بنجهز الروم…" : <><span className="pictionary-create-button-icon">＋</span><span><strong>إنشاء روم جديدة</strong><small>ابدأ روم خاصة بـ {maxRounds} جولات</small></span><b>←</b></>}</button></div><div className="pictionary-lobby-card"><h2>ادخل روم موجودة</h2><p>معاك كود من صاحبك؟ اكتبه هنا وادخل معاه فورًا.</p><input className="pictionary-lobby-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={7} placeholder="KJ-ABCD" /><button className="pictionary-lobby-secondary" onClick={joinRoom} disabled={busy}>دخول الروم ←</button></div></div>
      {error && <p className="pictionary-lobby-error">{error}</p>}
      <p className="pictionary-lobby-note">لا يوجد لعب منفرد هنا — اللعبة تبدأ أونلاين بعد دخول 3 لاعبين، وتستوعب الروم 6 لاعبين.</p>
    </div></section>
  );
}
