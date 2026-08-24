// Style reminder: Mafioso lobby is a cinematic detective waiting room—warm gold, olive curtains, and five intentional seats before the case begins.
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { mafiosoChannelName } from "../lib/mafioso-channel";

type Me = { nickname?: string } | null;
type Player = { userId: string; nickname: string; isYou?: boolean; status?: string };
type Difficulty = "any" | "easy" | "medium" | "hard";
type DifficultyCounts = { easy: number; medium: number; hard: number };
type OpenRoom = { code: string; hostNickname: string; playerCount: number; maxPlayers: 4 | 5; seatsLeft: number; difficultyPreference?: Difficulty };
type Props = { me: Me; onStarted: (code: string) => void };

export default function MafiosoLobby({ me, onStarted }: Props) {
  const [room, setRoom] = useState<{ code: string; isHost: boolean; playerCount: 4 | 5 } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [openRoomsLoading, setOpenRoomsLoading] = useState(true);
  const [createPlayerCount, setCreatePlayerCount] = useState<4 | 5>(5);
  const [createDifficulty, setCreateDifficulty] = useState<Difficulty>("any");
  const [difficultyCounts, setDifficultyCounts] = useState<Record<4 | 5, DifficultyCounts>>({ 4: { easy: 0, medium: 0, hard: 0 }, 5: { easy: 0, medium: 0, hard: 0 } });
  const roomPlayerCount = room?.playerCount || 5;
  const selectedDifficultyCounts = difficultyCounts[createPlayerCount];
  const hasSelectedDifficultyCases = createDifficulty === "any" || selectedDifficultyCounts[createDifficulty] > 0;
  const seats = useMemo(() => [...[...players].sort((first, second) => (first.status === "left" ? 1 : 0) - (second.status === "left" ? 1 : 0)), ...Array.from({ length: roomPlayerCount }, () => null as Player | null)].slice(0, roomPlayerCount), [players, roomPlayerCount]);
  const activePlayersCount = players.filter((player) => player.status !== "left").length;
  const lastLeftPlayer = [...players].reverse().find((player) => player.status === "left");

  async function post(action: string, code?: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/mafioso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, code, ...extra }) });
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
    setRoom((current) => current?.code === code ? { ...current, playerCount: data.room.player_count === 4 ? 4 : 5 } : current);
    if (data.room.status === "finished") { setRoom(null); setPlayers([]); setError("الروم اتقفلت. رجعتك للـLobby."); void loadOpenRooms(); return; }
    if (data.room.status !== "waiting") onStarted(code);
  }

  async function loadOpenRooms() {
    setOpenRoomsLoading(true);
    const res = await fetch("/api/mafioso?openRooms=1", { cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setOpenRooms(data.rooms || []);
      if (data.difficultyCounts?.[4] && data.difficultyCounts?.[5]) setDifficultyCounts(data.difficultyCounts);
    }
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
    if (!hasSelectedDifficultyCases) {
      setError("المستوى ده مفيهوش قضايا مناسبة لعدد اللاعبين المختار. اختار مستوى تاني أو أي صعوبة.");
      return;
    }
    const data = await post("create_room", undefined, { playerCount: createPlayerCount, difficultyPreference: createDifficulty });
    if (!data?.code) return;
    setRoom({ code: data.code, isHost: true, playerCount: data.playerCount === 4 ? 4 : 5 });
    setPlayers([{ userId: "you", nickname: me?.nickname || "أنت", isYou: true }]);
  }

  async function joinRoom(openRoomCode?: string) {
    const code = (openRoomCode || joinCode).trim().toUpperCase();
    if (!code) { setError("اكتب كود الروم الأول"); return; }
    const data = await post("join_room", code);
    if (!data?.ok) return;
    setRoom({ code, isHost: Boolean(data.isHost), playerCount: 5 });
    await readRoom(code);
  }

  async function start() {
    if (!room || activePlayersCount !== roomPlayerCount) return;
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
      <header className="mafioso-lobby-header"><div><span>✦ قضية أونلاين · {roomPlayerCount} لاعبين</span><h1>اجمعوا الـ{roomPlayerCount}… والسر يبدأ</h1><p>كل واحد يدخل بنفس الكود. أول ما تكملوا {roomPlayerCount}، صاحب الروم يفتح القضية.</p></div><b className="mafioso-live"><i /> {live ? "متصلين لحظيًا" : "جاري الاتصال"}</b></header>
      <div className="mafioso-code-panel"><div><small>كود الروم</small><strong>{room.code}</strong></div><button onClick={() => navigator.clipboard?.writeText(room.code).then(() => setError("اتنسخ الكود"))}>نسخ</button></div>
      {lastLeftPlayer && <p className="mafioso-player-left-notice"><b>{lastLeftPlayer.nickname}</b> خرج من الروم — مستنيين لاعب مكانه.</p>}
      <div className="mafioso-lobby-seats">{seats.map((player: any, index) => player ? <div className={`mafioso-lobby-seat occupied ${player.status === "left" ? "left" : ""}`} key={player.userId}><span>{player.status === "left" ? "↗" : player.nickname.charAt(0)}</span><b>{player.nickname}{player.isYou ? " (أنت)" : ""}</b><small>{player.status === "left" ? "خرج من الروم" : room.isHost && player.isYou ? "صاحب الروم" : "وصل"}</small></div> : <div className="mafioso-lobby-seat" key={`empty-${index}`}><span>＋</span><small>مستنيين لاعب</small></div>)}</div>
      <div className="mafioso-lobby-footer"><p><strong>{activePlayersCount}/{roomPlayerCount}</strong> لاعبين {activePlayersCount === roomPlayerCount ? "— الروم جاهزة" : `— محتاجين ${roomPlayerCount - activePlayersCount} كمان`}</p><div className="mafioso-lobby-actions">{!room.isHost && <button className="mafioso-secondary mafioso-lobby-exit" disabled={busy} onClick={() => void exitRoom()}>اخرج من الروم</button>}{room.isHost && <button className="mafioso-lobby-close" disabled={busy} onClick={() => void closeRoom()}>اقفل واحذف الروم</button>}<button className="mafioso-primary" disabled={!room.isHost || activePlayersCount !== roomPlayerCount || busy} onClick={start}>{busy ? "بنفتح القضية…" : activePlayersCount === roomPlayerCount ? "ابدأ القضية" : `مستنيين الـ${roomPlayerCount}`}</button></div></div>
      {error && <p className="mafioso-error">{error}</p>}
    </div></section>;
  }

  return <section className="mafioso-lobby-shell"><div className="mafioso-lobby mafioso-home">
    <header className="mafioso-lobby-header"><div><span>✦ مافيوسو أونلاين</span><h1>مين فينا بيكدب؟</h1><p>اختاروا روم 4 أو 5 لاعبين، وكل وضع له قضايا وأدلة مختلفة.</p></div><div className="mafioso-lobby-lamp">🕵️</div></header>
    <div className="mafioso-lobby-grid"><article><i>✦</i><h2>أنشئ قضية جديدة</h2><p>اختار عدد اللاعبين والصعوبة، وخد كود روم خاص تبعته لأصحابك.</p><div className="mafioso-room-mode-picker"><button type="button" className={createPlayerCount === 4 ? "selected" : ""} onClick={() => setCreatePlayerCount(4)}><b>4 لاعبين</b><small>1 مافيوسو · 3 أدلة</small></button><button type="button" className={createPlayerCount === 5 ? "selected" : ""} onClick={() => setCreatePlayerCount(5)}><b>5 لاعبين</b><small>2 مافيوسو · 4 أدلة</small></button></div><div className="mafioso-difficulty-picker mafioso-lobby-difficulty"><button type="button" className={createDifficulty === "any" ? "selected any" : ""} onClick={() => setCreateDifficulty("any")}>أي صعوبة <small>المتاح</small></button><button type="button" disabled={selectedDifficultyCounts.easy === 0} className={`${createDifficulty === "easy" ? "selected easy" : ""}${selectedDifficultyCounts.easy === 0 ? " unavailable" : ""}`} onClick={() => setCreateDifficulty("easy")}>سهل <small>{selectedDifficultyCounts.easy} قضية</small></button><button type="button" disabled={selectedDifficultyCounts.medium === 0} className={`${createDifficulty === "medium" ? "selected medium" : ""}${selectedDifficultyCounts.medium === 0 ? " unavailable" : ""}`} onClick={() => setCreateDifficulty("medium")}>متوسط <small>{selectedDifficultyCounts.medium} قضية</small></button><button type="button" disabled={selectedDifficultyCounts.hard === 0} className={`${createDifficulty === "hard" ? "selected hard" : ""}${selectedDifficultyCounts.hard === 0 ? " unavailable" : ""}`} onClick={() => setCreateDifficulty("hard")}>صعب <small>{selectedDifficultyCounts.hard} قضية</small></button></div><button className="mafioso-primary" disabled={busy || !hasSelectedDifficultyCases} onClick={createRoom}>{busy ? "بنجهز الروم…" : !hasSelectedDifficultyCases ? "مفيش قضايا بالمستوى ده" : `إنشاء روم ${createPlayerCount} لاعبين`}</button></article><article className="mafioso-join"><i>⌁</i><h2>ادخل روم موجودة</h2><p>معاك كود من صاحبك؟ اكتبه وادخل على طول.</p>{mode === "join" && <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="MF-ABCD" maxLength={7} />}<button className="mafioso-secondary" disabled={busy} onClick={() => mode === "join" ? void joinRoom() : setMode("join")}>{mode === "join" ? "دخول الروم ←" : "معايا كود روم"}</button></article></div>
    <div className="mafioso-rules"><span>4 لاعبين: 1 مافيوسو + 3 أدلة</span><span>5 لاعبين: 2 مافيوسو + 4 أدلة</span><span>تصويت واحد في كل جولة</span></div>
    <section className="mafioso-open-rooms">
      <header><div><span>متاح دلوقتي</span><h2>رومات مستنية لاعبين</h2><p>اختار روم جاهزة بدل ما تستنى كود من صاحبك.</p></div><button type="button" onClick={() => void loadOpenRooms()} disabled={openRoomsLoading || busy} aria-label="تحديث الرومات">↻</button></header>
      {openRoomsLoading ? <div className="mafioso-open-rooms-empty">جاري نشوف الرومات…</div> : openRooms.length === 0 ? <div className="mafioso-open-rooms-empty"><span>⌁</span><b>مفيش روم مفتوحة دلوقتي</b><p>اعمل روم وابعت الكود لأصحابك، وهيظهروا هنا أول ما يدخلوا.</p></div> : <div className="mafioso-open-rooms-grid">{openRooms.map((openRoom) => <article key={openRoom.code}><div className="mafioso-open-room-host"><span>{openRoom.hostNickname.charAt(0)}</span><div><small>صاحب الروم · {openRoom.maxPlayers} لاعبين · {openRoom.difficultyPreference === "easy" ? "سهل" : openRoom.difficultyPreference === "hard" ? "صعب" : openRoom.difficultyPreference === "medium" ? "متوسط" : "أي صعوبة"}</small><b>{openRoom.hostNickname}</b></div><em>{openRoom.playerCount}/{openRoom.maxPlayers}</em></div><div className="mafioso-open-room-code"><span>كود الروم</span><strong>{openRoom.code}</strong></div><p>فاضل {openRoom.seatsLeft} {openRoom.seatsLeft === 1 ? "لاعب" : "لاعبين"}</p><button className="mafioso-primary" disabled={busy || openRoom.playerCount >= openRoom.maxPlayers} onClick={() => void joinRoom(openRoom.code)}>ادخل الروم ←</button></article>)}</div>}
    </section>{error && <p className="mafioso-error">{error}</p>}
  </div></section>;
}
