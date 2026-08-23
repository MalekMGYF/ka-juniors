// Style reminder: Mafioso lobby is a cinematic detective waiting room—warm gold, olive curtains, and five intentional seats before the case begins.
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { mafiosoChannelName } from "../lib/mafioso-channel";

type Me = { nickname?: string } | null;
type Player = { userId: string; nickname: string; isYou?: boolean; status?: string };
type OpenRoom = { code: string; hostNickname: string; playerCount: number; seatsLeft: number };
type Props = { me: Me; onStarted: (code: string) => void };

const emptySeats = Array.from({ length: 5 });

export default function MafiosoLobby({ me, onStarted }: Props) {
  const [room, setRoom] = useState<{ code: string; isHost: boolean } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [openRoomsLoading, setOpenRoomsLoading] = useState(true);
  const seats = useMemo(() => [...players, ...emptySeats].slice(0, 5), [players]);

  async function post(action: string, code?: string) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/mafioso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "حصلت مشكلة، جرّب تاني"); return null; }
      return data;
    } catch { setError("مش قادرين نوصل للسيرفر دلوقتي"); return null; }
    finally { setBusy(false); }
  }

  async function readRoom(code: string) {
    const res = await fetch(`/api/mafioso?code=${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!data.room) return;
    setPlayers((data.players || []).map((item: any) => ({ userId: item.userId, nickname: item.nickname, isYou: item.userId === data.sessionUserId, status: item.status })));
    if (data.room.status === "finished") { setRoom(null); setPlayers([]); setError("الروم اتقفلت. رجعتك للـLobby."); void loadOpenRooms(); return; }
    if (data.room.status !== "waiting") onStarted(code);
  }

  async function loadOpenRooms() {
    setOpenRoomsLoading(true);
    const res = await fetch("/api/mafioso?openRooms=1", { cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setOpenRooms(data.rooms || []);
    setOpenRoomsLoading(false);
  }

  useEffect(() => {
    if (!room?.code) return;
    void readRoom(room.code);
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(mafiosoChannelName(room.code), { config: { broadcast: { self: false } } });
    ["player_joined", "player_left", "room_closed", "game_started"].forEach((event) => channel.on("broadcast", { event }, () => void readRoom(room.code)));
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { void client.removeChannel(channel); };
  }, [room?.code]);

  useEffect(() => {
    if (room) return;
    void loadOpenRooms();
    const refresh = window.setInterval(() => void loadOpenRooms(), 5000);
    return () => window.clearInterval(refresh);
  }, [room]);

  async function createRoom() {
    const data = await post("create_room");
    if (!data?.code) return;
    setRoom({ code: data.code, isHost: true });
    setPlayers([{ userId: "you", nickname: me?.nickname || "أنت", isYou: true }]);
  }

  async function joinRoom(openRoomCode?: string) {
    const code = (openRoomCode || joinCode).trim().toUpperCase();
    if (!code) { setError("اكتب كود الروم الأول"); return; }
    const data = await post("join_room", code);
    if (!data?.ok) return;
    setRoom({ code, isHost: Boolean(data.isHost) });
    await readRoom(code);
  }

  async function start() {
    if (!room || players.length !== 5) return;
    const data = await post("start_game", room.code);
    if (data?.ok) onStarted(room.code);
  }

  async function exitRoom() {
    if (!room) return;
    const data = await post("leave_room", room.code);
    if (!data?.ok) return;
    setRoom(null); setPlayers([]); setError(""); void loadOpenRooms();
  }

  async function closeRoom() {
    if (!room || !window.confirm("تقفل الروم وتخرج كل الناس اللي فيها؟")) return;
    const data = await post("close_room", room.code);
    if (!data?.ok) return;
    setRoom(null); setPlayers([]); setError("اتقفلت الروم وخرج كل اللاعبين."); void loadOpenRooms();
  }

  if (room) {
    return <section className="mafioso-lobby-shell"><div className="mafioso-lobby">
      <header className="mafioso-lobby-header"><div><span>✦ قضية أونلاين</span><h1>اجمعوا الخمسة… والسر يبدأ</h1><p>كل واحد يدخل بنفس الكود. أول ما تكملوا 5، صاحب الروم يفتح القضية.</p></div><b className="mafioso-live"><i /> {live ? "متصلين لحظيًا" : "جاري الاتصال"}</b></header>
      <div className="mafioso-code-panel"><div><small>كود الروم</small><strong>{room.code}</strong></div><button onClick={() => navigator.clipboard?.writeText(room.code).then(() => setError("اتنسخ الكود"))}>نسخ</button></div>
      <div className="mafioso-lobby-seats">{seats.map((player: any, index) => player ? <div className="mafioso-lobby-seat occupied" key={player.userId}><span>{player.nickname.charAt(0)}</span><b>{player.nickname}{player.isYou ? " (أنت)" : ""}</b><small>{room.isHost && player.isYou ? "صاحب الروم" : "وصل"}</small></div> : <div className="mafioso-lobby-seat" key={`empty-${index}`}><span>＋</span><small>مستنيين لاعب</small></div>)}</div>
      <div className="mafioso-lobby-footer"><p><strong>{players.length}/5</strong> لاعبين {players.length === 5 ? "— الروم جاهزة" : `— محتاجين ${5 - players.length} كمان`}</p><div className="mafioso-lobby-actions">{!room.isHost && <button className="mafioso-secondary mafioso-lobby-exit" disabled={busy} onClick={() => void exitRoom()}>اخرج من الروم</button>}{room.isHost && <button className="mafioso-lobby-close" disabled={busy} onClick={() => void closeRoom()}>اقفل واحذف الروم</button>}<button className="mafioso-primary" disabled={!room.isHost || players.length !== 5 || busy} onClick={start}>{busy ? "بنفتح القضية…" : players.length === 5 ? "ابدأ القضية" : "مستنيين الخمسة"}</button></div></div>
      {error && <p className="mafioso-error">{error}</p>}
    </div></section>;
  }

  return <section className="mafioso-lobby-shell"><div className="mafioso-lobby mafioso-home">
    <header className="mafioso-lobby-header"><div><span>✦ مافيوسو أونلاين</span><h1>مين فينا بيكدب؟</h1><p>خمسة أصحاب، كارت سري لكل واحد، وقضية ما تتحلش غير لما تركزوا في كل كلمة.</p></div><div className="mafioso-lobby-lamp">🕵️</div></header>
    <div className="mafioso-lobby-grid"><article><i>✦</i><h2>أنشئ قضية جديدة</h2><p>خد كود روم خاص، ابعته لأربع أصحاب، وابدأوا لما تكملوا خمسة.</p><button className="mafioso-primary" disabled={busy} onClick={createRoom}>{busy ? "بنجهز الروم…" : "إنشاء روم"}</button></article><article className="mafioso-join"><i>⌁</i><h2>ادخل روم موجودة</h2><p>معاك كود من صاحبك؟ اكتبه وادخل على طول.</p>{mode === "join" && <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="MF-ABCD" maxLength={7} />}<button className="mafioso-secondary" disabled={busy} onClick={() => mode === "join" ? void joinRoom() : setMode("join")}>{mode === "join" ? "دخول الروم ←" : "معايا كود روم"}</button></article></div>
    <div className="mafioso-rules"><span>5 لاعبين بالظبط</span><span>2 مافيوسو مخفيين</span><span>4 أدلة + تصويت حاسم</span></div>
    <section className="mafioso-open-rooms">
      <header><div><span>متاح دلوقتي</span><h2>رومات مستنية لاعبين</h2><p>اختار روم جاهزة بدل ما تستنى كود من صاحبك.</p></div><button type="button" onClick={() => void loadOpenRooms()} disabled={openRoomsLoading || busy} aria-label="تحديث الرومات">↻</button></header>
      {openRoomsLoading ? <div className="mafioso-open-rooms-empty">جاري نشوف الرومات…</div> : openRooms.length === 0 ? <div className="mafioso-open-rooms-empty"><span>⌁</span><b>مفيش روم مفتوحة دلوقتي</b><p>اعمل روم وابعت الكود لأصحابك، وهيظهروا هنا أول ما يدخلوا.</p></div> : <div className="mafioso-open-rooms-grid">{openRooms.map((openRoom) => <article key={openRoom.code}><div className="mafioso-open-room-host"><span>{openRoom.hostNickname.charAt(0)}</span><div><small>صاحب الروم</small><b>{openRoom.hostNickname}</b></div><em>{openRoom.playerCount}/5</em></div><div className="mafioso-open-room-code"><span>كود الروم</span><strong>{openRoom.code}</strong></div><p>فاضل {openRoom.seatsLeft} {openRoom.seatsLeft === 1 ? "لاعب" : "لاعبين"}</p><button className="mafioso-primary" disabled={busy || openRoom.playerCount >= 5} onClick={() => void joinRoom(openRoom.code)}>ادخل الروم ←</button></article>)}</div>}
    </section>{error && <p className="mafioso-error">{error}</p>}
  </div></section>;
}
