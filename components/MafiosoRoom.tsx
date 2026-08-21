// Style reminder: Mafioso is a cinematic tabletop investigation—names must be unmistakable, seats clearly separated, and the final reveal should feel like one complete scene.
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { mafiosoChannelName } from "../lib/mafioso-channel";

type Snapshot = any;
type Props = { code: string; onLeave: () => void };
const positions = ["north", "east-top", "east-bottom", "south", "west"];

export default function MafiosoRoom({ code, onLeave }: Props) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function load() {
    const res = await fetch(`/api/mafioso?code=${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
    const next = res ? await res.json().catch(() => ({})) : {};
    if (next.room) setData(next); else if (next.error) setError(next.error);
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
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 7000);
    const client = getSupabaseBrowserClient();
    if (!client) return () => window.clearInterval(timer);
    const channel = client.channel(mafiosoChannelName(code), { config: { broadcast: { self: false } } });
    ["player_joined", "player_left", "game_started", "role_acknowledged", "clue_revealed", "voting_started", "message_created", "vote_cast", "vote_resolved", "game_finished"].forEach((event) => channel.on("broadcast", { event }, () => void load()));
    channel.subscribe();
    return () => { window.clearInterval(timer); void client.removeChannel(channel); };
  }, [code]);
  const seconds = useMemo(() => data?.room?.phase_ends_at ? Math.max(0, Math.ceil((new Date(data.room.phase_ends_at).getTime() - now) / 1000)) : 0, [data?.room?.phase_ends_at, now]);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const room = data?.room;
  const players = data?.players || [];
  const finished = room?.status === "finished";
  const canShowRole = room?.status === "role_reveal" && data?.ownCard && !data.ownCard.acknowledged;
  const sendMessage = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; if (await post("message", { message })) setMessage(""); };
  const leave = async () => { await post("leave_room"); onLeave(); };
  const phaseLabel = room?.status === "voting" ? "وقت التصويت" : room?.status === "discussion" ? "وقت النقاش" : room?.status === "role_reveal" ? "الكروت اتوزعت" : "القضية اتقفلت";
  const tableLabel = room?.status === "discussion" ? data.currentClue || "الدليل جاي…" : room?.status === "voting" ? "اختاروا المشتبه" : finished ? "الحقيقة اتكشفت" : "كل واحد يراجع كارتُه";

  if (!data) return <div className="card empty">جاري فتح غرفة القضية…</div>;
  return <section className="mafioso-room-shell">
    <header className="mafioso-room-head"><div><span>✦ ملف التحقيق · {code}</span><h1>{data.case?.title || "قضية قيد التحضير"}</h1><p>{data.case?.subtitle || "استنوا كشف البطاقات"}</p></div><div className="mafioso-clock"><small>{phaseLabel}</small><strong>{finished ? "✦" : time}</strong></div></header>
    <div className="mafioso-stage">
      <div className="mafioso-curtains" /><div className="mafioso-floor-lines" /><div className="mafioso-lamp-glow left" /><div className="mafioso-lamp-glow right" />
      <div className="mafioso-sofa"><span>غرفة التحقيق</span></div><div className="mafioso-table"><span>مافيا بوص</span><b>{tableLabel}</b><i>الجولة {room?.round_number || 1}</i></div>
      {players.map((player: any, index: number) => <div className={`mafioso-seat ${positions[index] || "south"} ${player.status === "eliminated" ? "eliminated" : ""} ${player.isYou ? "you" : ""}`} key={player.userId}>
        <div className="mafioso-seat-frame"><div className="mafioso-avatar">{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : player.nickname.charAt(0)}</div><div className="mafioso-seat-copy"><b title={player.displayName}>{player.displayName}</b><small className={player.revealedAlignment ? `revealed ${player.revealedAlignment}` : ""}>{player.revealedAlignment === "mafia" ? "✦ طلع مافيوسو" : player.revealedAlignment === "innocent" ? "✦ طلع بريء" : player.status === "eliminated" ? "اتفرج بس" : "جوه التحقيق"}</small></div></div>
        {room?.status === "voting" && <em>{player.voteCount || 0} أصوات</em>}
      </div>)}
    </div>
    {!finished && <>
      {room?.status === "role_reveal" && <div className="mafioso-boss-note">مافيا بوص: <b>الكروت اتوزّعت، لكن الاسم المكتوب تحت كل صورة هو شخصيتكم في القضية.</b> {data.case?.briefing || "ركزوا في الدوافع قبل ما يبدأ التحقيق."}</div>}
      {room?.status === "discussion" && <div className="mafioso-boss-note clue"><span>الدليل رقم {room.round_number}</span><b>{data.currentClue}</b></div>}
      {room?.status === "voting" && <div className="mafioso-boss-note vote">مافيا بوص: <b>صوّتوا على شخص واحد بس — ومينفعش حد يصوّت لنفسه.</b> {data.canVote ? data.hasVoted ? "صوتك اتسجل." : "اختار المتهم من تحت." : "أنت متفرج في الجولة دي."}</div>}
      <section className="mafioso-side-grid"><article className="mafioso-motives"><h2>دوافع الشخصيات</h2>{(data.motives || []).map((motive: any) => <p key={motive.roleName}><b>{motive.roleName}</b><span>{motive.motive}</span></p>)}</article><article className="mafioso-chat"><h2>{room?.status === "voting" ? "صوّت على المشتبه" : "شات القضية"}</h2>{room?.status === "voting" ? <div className="mafioso-vote-list">{players.filter((p: any) => p.status === "active" && !p.isYou).map((player: any) => <button disabled={!data.canVote || data.hasVoted || busy} onClick={() => void post("vote", { targetId: player.userId })} key={player.userId}><span>{player.nickname.charAt(0)}</span><b>{player.displayName}</b><small>{player.voteCount || 0} أصوات</small></button>)}</div> : <><div className="mafioso-messages">{(data.messages || []).slice(-50).map((item: any) => <p key={item.id}><b>{item.author}</b><span>{item.body}</span></p>)}{!data.messages?.length && <small>ابدأوا كلامكم أول ما ينزل الدليل.</small>}</div><form onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} disabled={!data.canChat || busy} maxLength={420} placeholder={data.canChat ? "اكتب اللي لاحظته…" : "الشات مقفول دلوقتي"} /><button disabled={!data.canChat || busy}>إرسال</button></form></>}</article></section>
    </>}
    {finished && <div className="mafioso-ending-layer" role="dialog" aria-modal="true" aria-label="نهاية القضية"><section className="mafioso-ending-card"><span className={room.final_winner === "innocent" ? "ending-crown innocent" : "ending-crown mafia"}>{room.final_winner === "innocent" ? "البريئين كسبوا" : "المافيوسو كسبوا"}</span><h2>{data.case?.revealTitle || "الحقيقة الكاملة"}</h2><p>{data.case?.revealStory}</p><div className="mafioso-ending-roster">{players.map((player: any) => <div className={player.revealedAlignment === "mafia" ? "mafia" : "innocent"} key={player.userId}><span>{player.revealedAlignment === "mafia" ? "مافيوسو" : "بريء"}</span><b>{player.displayName}</b></div>)}</div>{data.case?.revealAudioPath && <audio controls src={data.case.revealAudioPath} />}<button className="mafioso-primary mafioso-ending-exit" onClick={() => void leave()} disabled={busy}>اخرج من الروم</button></section></div>}
    {canShowRole && <div className="mafioso-role-overlay"><div><span>كارتك السري</span><h2>{data.ownCard.roleName}</h2><b className={data.ownCard.alignment === "mafia" ? "mafia" : "innocent"}>{data.ownCard.alignment === "mafia" ? "أنت مافيوسو" : "أنت بريء"}</b><p>{data.ownCard.cardText}</p><button className="mafioso-primary" onClick={() => void post("acknowledge_role")} disabled={busy}>فهمت دوري</button></div></div>}
    {error && <p className="mafioso-error">{error}</p>}{!finished && <button className="mafioso-leave" onClick={leave}>خروج من الروم</button>}
  </section>;
}
