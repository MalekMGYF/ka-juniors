// Style reminder: Mafioso v2 is a focused case theatre—one readable scene at a time, an unmistakable Boss presence, and no secret-case details on a player's card.
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { mafiosoChannelName } from "../lib/mafioso-channel";

type Snapshot = any;
type Props = { code: string; onLeave: () => void };
const positions = ["north", "east-top", "east-bottom", "south", "west"];

function playBossChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    gain.connect(context.destination);
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.09);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.09);
      oscillator.stop(context.currentTime + 0.46);
    });
    window.setTimeout(() => void context.close(), 700);
  } catch {}
}

export default function MafiosoRoom({ code, onLeave }: Props) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const previousStatus = useRef<string | null>(null);

  async function load() {
    const res = await fetch(`/api/mafioso?code=${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
    const next = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && next.room) {
      setData(next);
      setError("");
    } else {
      setError(next.error || "الروم دي مش موجودة أو اتقفلت. ارجع للـLobby واعمل روم جديدة.");
    }
    setLoading(false);
  }

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/mafioso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, code, ...extra }) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { setError(result.error || "حصلت مشكلة"); return false; }
      await load(); return true;
    } catch { setError("مش قادرين نوصل للسيرفر"); return false; }
    finally { setBusy(false); }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 3000);
    const client = getSupabaseBrowserClient();
    if (!client) return () => window.clearInterval(timer);
    const channel = client.channel(mafiosoChannelName(code), { config: { broadcast: { self: false } } });
    ["player_joined", "player_left", "room_closed", "game_started", "role_acknowledged", "boss_intro_started", "boss_intro_acknowledged", "clue_announced", "discussion_started", "vote_ready_changed", "vote_announcement_started", "voting_started", "message_created", "vote_cast", "vote_resolved", "game_finished"].forEach((event) => channel.on("broadcast", { event }, () => void load()));
    channel.subscribe();
    return () => { window.clearInterval(timer); void client.removeChannel(channel); };
  }, [code]);

  const roomStatus = data?.room?.status;
  useEffect(() => {
    if (!roomStatus) return;
    if (previousStatus.current && previousStatus.current !== roomStatus && ["boss_intro", "clue_reveal", "vote_announcement", "vote_result", "finished"].includes(roomStatus)) playBossChime();
    previousStatus.current = roomStatus;
  }, [roomStatus]);

  const seconds = useMemo(() => data?.room?.phase_ends_at ? Math.max(0, Math.ceil((new Date(data.room.phase_ends_at).getTime() - now) / 1000)) : 0, [data?.room?.phase_ends_at, now]);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const room = data?.room;
  const players = data?.players || [];
  const finished = room?.status === "finished";
  const roomClosedEarly = finished && !room?.final_winner;
  const canShowRole = room?.status === "role_reveal" && data?.ownCard && !data.ownCard.acknowledged;
  const readWait = Math.max(0, seconds - 55);
  const canConfirmRole = readWait === 0;
  const sendMessage = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; if (await post("message", { message })) setMessage(""); };
  const leave = async () => { await post("leave_room"); onLeave(); };
  const phaseLabel = room?.status === "voting" ? "وقت التصويت" : room?.status === "discussion" ? "وقت النقاش" : room?.status === "role_reveal" ? "اقرأ كارتك" : room?.status === "boss_intro" ? "مافيا بوص بيتكلم" : room?.status === "clue_reveal" ? "اسمع الدليل" : room?.status === "vote_announcement" ? "استعد للتصويت" : room?.status === "vote_result" ? "نتيجة التصويت" : "نهاية القضية";
  const tableLabel = room?.status === "discussion" ? "شات التحقيق مفتوح" : room?.status === "voting" ? "اختاروا المشتبه" : finished ? "الحقيقة اتكشفت" : "غرفة القضية";
  const isBossScene = room?.status === "boss_intro";
  const isClueScene = room?.status === "clue_reveal";
  const isVoteAnnouncement = room?.status === "vote_announcement";
  const isVoteResult = room?.status === "vote_result";
  const discussionReady = data?.discussionReady || { readyCount: 0, requiredCount: 0, isYouReady: false, canRequestVote: false };
  const bossIntro = data?.bossIntro || { acknowledgedCount: 0, requiredCount: 0, isYouAcknowledged: false, canAcknowledge: false };
  const finalTwoVote = Boolean(data?.finalTwoVote);

  if (!data) return <div className="card empty mafioso-room-load-state"><b>{loading ? "جاري فتح غرفة القضية…" : "مش قادرين نفتح الروم"}</b>{!loading && <><p>{error}</p><button className="mafioso-primary" type="button" onClick={onLeave}>ارجع للـLobby</button></>}</div>;
  return <section className="mafioso-room-shell mafioso-v2-shell">
    <header className="mafioso-room-head"><div><span>✦ ملف التحقيق · {code}</span><h1>{data.case?.title || "قضية قيد التحضير"}</h1><p>{data.case?.subtitle || "استنوا كشف البطاقات"}</p></div><div className="mafioso-clock"><small>{phaseLabel}</small><strong>{finished ? "✦" : time}</strong></div></header>
    <div className="mafioso-stage mafioso-v2-stage">
      <div className="mafioso-curtains" /><div className="mafioso-floor-lines" /><div className="mafioso-lamp-glow left" /><div className="mafioso-lamp-glow right" />
      <div className="mafioso-sofa"><span>مجلس القضية</span></div><div className="mafioso-table"><span>مافيا بوص</span><b>{tableLabel}</b><i>الجولة {room?.round_number || 1}</i></div>
      {players.map((player: any, index: number) => <div className={`mafioso-seat ${positions[index] || "south"} ${player.status === "eliminated" ? "eliminated" : ""} ${player.isYou ? "you" : ""}`} key={player.userId}>
        <div className="mafioso-seat-frame"><div className="mafioso-avatar">{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : player.nickname.charAt(0)}</div><div className="mafioso-seat-copy"><b title={player.displayName}>{player.displayName}</b><small className={player.revealedAlignment ? `revealed ${player.revealedAlignment}` : player.isReadyForVote ? "ready-for-vote" : ""}>{player.revealedAlignment === "mafia" ? "✦ طلع مافيوسو" : player.revealedAlignment === "innocent" ? "✦ طلع بريء" : player.status === "eliminated" ? "اتفرج بس" : player.isReadyForVote ? "✓ جاهز للتصويت" : "جوه التحقيق"}</small></div></div>
        {room?.status === "voting" && <em>{player.voteCount || 0} أصوات</em>}
      </div>)}
    </div>

    {room?.status === "discussion" && <><div className="mafioso-boss-note clue"><span>الدليل رقم {room.round_number}</span><b>{data.currentClue}</b></div><section className="mafioso-side-grid"><article className="mafioso-motives"><h2>دوافع الشخصيات</h2>{(data.motives || []).map((motive: any) => <p key={motive.roleName}><b>{motive.roleName}</b><span>{motive.motive}</span></p>)}</article><article className="mafioso-chat"><h2>شات القضية</h2><div className="mafioso-messages">{(data.messages || []).slice(-50).map((item: any) => <p key={item.id}><b>{item.author}</b><span>{item.body}</span></p>)}{!data.messages?.length && <small>ابدأوا كلامكم، الدليل قدامكم.</small>}</div><form onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} disabled={!data.canChat || busy} maxLength={420} placeholder={data.canChat ? "اكتب اللي لاحظته…" : "الشات مقفول دلوقتي"} /><button disabled={!data.canChat || busy}>إرسال</button></form></article><article className="mafioso-discussion-ready"><div className="mafioso-discussion-ready-head"><div><span>اختصار وقت النقاش</span><h2>جاهزين للتصويت؟</h2><p>لما كل اللاعبين اللي لسه في القضية يأكدوا، التصويت هيفتح فورًا.</p></div><b>{discussionReady.readyCount}/{discussionReady.requiredCount}</b></div><div className="mafioso-ready-roster">{players.filter((player: any) => player.status === "active").map((player: any) => <span className={player.isReadyForVote ? "is-ready" : ""} key={player.userId}>{player.isReadyForVote ? "✓" : "…"} {player.displayName}</span>)}</div><button className="mafioso-ready-button" type="button" onClick={() => void post("ready_for_vote")} disabled={!discussionReady.canRequestVote || discussionReady.isYouReady || busy}>{discussionReady.isYouReady ? "أنت جاهز للتصويت ✓" : discussionReady.canRequestVote ? "جاهز للتصويت" : "أنت متفرج في الجولة دي"}</button></article></section></>}
    {room?.status === "voting" && <section className="mafioso-voting-focus"><div className="mafioso-boss-note vote"><span>{finalTwoVote ? "قرار المستبعدين" : "التصويت مفتوح"}</span><b>{finalTwoVote ? "آخر اتنين ما يصوتوش — المستبعدين البريئين بس هم اللي يختاروا مين يخرج." : "اختار شخص واحد بس — ومينفعش تصوّت على نفسك."}</b>{data.canVote ? data.hasVoted ? "صوتك اتسجل." : "اختار المتهم." : finalTwoVote ? data.finalEligibleVoterCount === 0 ? "مفيش بريء مستبعد للتصويت؛ القرار هيتحسم لما الوقت يخلص." : "أنت مش من المستبعدين البريئين في الجولة دي." : "أنت متفرج في الجولة دي."}</div><div className="mafioso-vote-list">{players.filter((p: any) => p.status === "active" && !p.isYou).map((player: any) => <button disabled={!data.canVote || data.hasVoted || busy} onClick={() => void post("vote", { targetId: player.userId })} key={player.userId}><span>{player.nickname.charAt(0)}</span><b>{player.displayName}</b><small>{player.voteCount || 0} أصوات</small></button>)}</div></section>}

    {isBossScene && <div className="mafioso-scene-overlay boss" role="dialog" aria-modal="true"><section><span className="mafioso-boss-emblem">✦</span><small>مافيا بوص بيقول</small><h2>{data.case?.title}</h2><p>{data.case?.briefing}</p><div className="mafioso-scene-motives">{(data.motives || []).map((motive: any) => <p key={motive.roleName}><b>{motive.roleName}</b><span>{motive.motive}</span></p>)}</div><div className="mafioso-boss-ready"><div><b>اقروا القصة والدوافع براحتكم</b><span>مش هنكمل غير لما كل اللاعبين اللي لسه في القضية يدوسوا «فهمت القصة».</span></div><strong>{bossIntro.acknowledgedCount}/{bossIntro.requiredCount}</strong></div><div className="mafioso-boss-ready-roster">{players.filter((player: any) => player.status === "active").map((player: any) => <span className={player.isBossIntroAcknowledged ? "is-ready" : ""} key={player.userId}>{player.isBossIntroAcknowledged ? "✓" : "…"} {player.displayName}</span>)}</div><button className="mafioso-primary mafioso-boss-ready-button" type="button" onClick={() => void post("acknowledge_boss_intro")} disabled={!bossIntro.canAcknowledge || bossIntro.isYouAcknowledged || busy}>{bossIntro.isYouAcknowledged ? "أنت فهمت القصة ✓" : bossIntro.canAcknowledge ? "فهمت القصة" : "أنت متفرج في الجولة دي"}</button></section></div>}
    {isClueScene && <div className="mafioso-scene-overlay clue" role="dialog" aria-modal="true"><section><span className="mafioso-boss-emblem">🔎</span><small>مافيا بوص · الدليل {room?.round_number}</small><h2>{data.currentClue}</h2><p>استعدوا للنقاش… الشات هيفتح تلقائيًا.</p><em>{time}</em></section></div>}
    {isVoteAnnouncement && <div className="mafioso-scene-overlay vote" role="dialog" aria-modal="true"><section><span className="mafioso-boss-emblem">⚖️</span><small>تنبيه مافيا بوص</small><h2>الوقت خلص. جهّزوا تصويتكم.</h2><p>كل لاعب مؤهل له صوت واحد، ومينفعش حد يصوّت على نفسه.</p><em>{time}</em></section></div>}
    {isVoteResult && <div className="mafioso-scene-overlay result" role="dialog" aria-modal="true"><section><span className="mafioso-boss-emblem">{data.lastVote?.alignment === "mafia" ? "✦" : "☀"}</span><small>نتيجة التصويت</small><h2>{data.lastVote?.isTie ? "الأصوات اتعادلت" : `${data.lastVote?.eliminatedName} طلع ${data.lastVote?.alignment === "mafia" ? "مافيوسو" : "بريء"}`}</h2><p>{data.lastVote?.isTie ? "محدش خرج من القضية الجولة دي." : `فاضل ${data.lastVote?.mafiaLeft ?? 0} مافيوسو في القضية.`}</p><em>{time}</em></section></div>}
    {finished && <div className="mafioso-ending-layer" role="dialog" aria-modal="true" aria-label="نهاية القضية"><section className="mafioso-ending-card"><span className={roomClosedEarly ? "ending-crown innocent" : room.final_winner === "innocent" ? "ending-crown innocent" : "ending-crown mafia"}>{roomClosedEarly ? "الروم اتقفلت" : room.final_winner === "innocent" ? "البريئين كسبوا" : "المافيوسو كسبوا"}</span><h2>{roomClosedEarly ? "القضية اتقفلت لأن لاعب خرج" : data.case?.revealTitle || "الحقيقة الكاملة"}</h2><p>{roomClosedEarly ? "الروم بتحتاج الخمسة يفضلوا موجودين. ارجع للـLobby واعملوا روم جديدة لما تكونوا جاهزين." : data.case?.revealStory}</p>{!roomClosedEarly && <><div className="mafioso-ending-roster">{players.map((player: any) => <div className={player.revealedAlignment === "mafia" ? "mafia" : "innocent"} key={player.userId}><span>{player.revealedAlignment === "mafia" ? "مافيوسو" : "بريء"}</span><b>{player.displayName}</b></div>)}</div>{data.case?.revealAudioPath && <audio controls src={data.case.revealAudioPath} />}<small className="mafioso-ending-countdown">النتيجة ظاهرة للجميع · {time}</small></>}<button className="mafioso-primary mafioso-ending-exit" onClick={() => void leave()} disabled={busy}>اخرج من الروم</button></section></div>}
    {canShowRole && <div className="mafioso-role-overlay"><div><span>كارتك السري</span><h2>{data.ownCard.roleName}</h2><b className={data.ownCard.alignment === "mafia" ? "mafia" : "innocent"}>{data.ownCard.alignment === "mafia" ? "أنت مافيوسو" : "أنت بريء"}</b><p>{data.ownCard.cardText}</p><button className="mafioso-primary" onClick={() => void post("acknowledge_role")} disabled={!canConfirmRole || busy}>{canConfirmRole ? "فهمت دوري" : `اقرأ كارتك · ${readWait}`}</button></div></div>}
    {error && <p className="mafioso-error">{error}</p>}{!finished && <button className="mafioso-leave" onClick={leave}>خروج من الروم</button>}
  </section>;
}
