// Style reminder: the game is a warm midnight cassette deck—audio leads, the lyric is highly legible, and answers only unlock a next question after a result.
"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import ShakeButton from "./ShakeButton";
import { vibrate, HAPTIC } from "../lib/haptics";

const WINDOW_SECONDS = 40;

type Me = { nickname: string; points: number; coins: number; daily_points?: number; avatar_url?: string | null; equippedFrameColor?: string | null } | null;
type SongQuestion = { id: string; title: string; promptText?: string; options?: string[]; introAudioUrl?: string | null } | null;
type Result = { correct: boolean; timedOut: boolean; correctIndex: number; fullLine: string; fullAudioUrl?: string | null; pointsEarned: number } | null;

export default function SongCompleteGame() {
  const [me, setMe] = useState<Me>(null);
  const [question, setQuestion] = useState<SongQuestion>(null);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutSentRef = useRef(false);

  const loadMe = async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    const data = await response.json();
    setMe(data.user || null);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
  };

  const playAudio = (url?: string | null) => {
    if (!url) { setError("الأدمن لسه مرفعش مقطع صوت للسؤال ده"); return; }
    stopAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => { setAudioPlaying(false); setError("تعذر تشغيل المقطع، جرّب تاني"); };
    void audio.play().catch(() => { setAudioPlaying(false); setError("المتصفح منع التشغيل، دوس على زر الصوت مرة تانية"); });
  };

  const loadQuestion = async () => {
    stopAudio();
    setLoading(true);
    setError("");
    setResult(null);
    timeoutSentRef.current = false;
    const response = await fetch("/api/songs", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || "حصل خطأ أثناء تحميل السؤال"); setQuestion(null); setLoading(false); return; }
    setQuestion(data.question || null);
    setStarted(Boolean(data.startedAt));
    setStartedAt(data.startedAt || null);
    if (data.startedAt) {
      const elapsed = Date.now() - new Date(data.startedAt).getTime();
      setSecondsLeft(Math.max(0, Math.ceil((WINDOW_SECONDS * 1000 - elapsed) / 1000)));
    } else setSecondsLeft(WINDOW_SECONDS);
    setLoading(false);
  };

  useEffect(() => { void loadMe(); void loadQuestion(); return stopAudio; }, []);

  const submit = async (action: "answer" | "timeout", selectedIndex = -1) => {
    if (!question || busy || result) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/songs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, action, selectedIndex }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || "حصل خطأ، جرب تاني"); return; }
    const nextResult = data as NonNullable<Result>;
    setResult(nextResult);
    vibrate(data.correct ? HAPTIC.win : 40);
    void loadMe();
    if (nextResult.fullAudioUrl) window.setTimeout(() => playAudio(nextResult.fullAudioUrl), 350);
  };

  useEffect(() => {
    if (!started || !startedAt || result || !question) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(startedAt).getTime() + WINDOW_SECONDS * 1000 - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !timeoutSentRef.current) {
        timeoutSentRef.current = true;
        void submit("timeout");
      }
    };
    tick();
    const interval = window.setInterval(tick, 300);
    return () => window.clearInterval(interval);
  }, [started, startedAt, result, question?.id]);

  const startQuestion = async () => {
    if (!question || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/songs/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || "حصل خطأ، جرب تاني"); return; }
    setStarted(true);
    setStartedAt(data.startedAt);
    setSecondsLeft(WINDOW_SECONDS);
    await loadQuestion();
  };

  const promptParts = question?.promptText?.split("…") || [];
  return (
    <AppShell nickname={me?.nickname} coins={me?.coins} points={me?.points} dailyPoints={me?.daily_points} avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}>
      <section className="song-game-shell">
        <div className="song-game-intro"><div><span className="song-eyebrow">تحدي السطر التالي</span><h1>كمل الأغنية <span>🎤</span></h1><p>اسمع الجزء، وكمل السطر قبل ما الأربعين ثانية تخلص. مفيش تخطي للسؤال.</p></div><div className={`song-timer ${started && !result ? "running" : ""} ${secondsLeft <= 8 && started && !result ? "danger" : ""}`}><b>{String(secondsLeft).padStart(2, "0")}</b><small>ثانية</small></div></div>
        {loading ? <div className="card empty">جاري تحضير السؤال…</div> : !question ? <div className="song-empty"><span>♫</span><h2>خلصت كل أسئلة كمل الأغنية المتاحة</h2><p>الأدمن يقدر يضيف أسئلة جديدة من لوحة التحكم، وكل سؤال بتجاوب عليه مرة واحدة فقط.</p></div> : <div className="song-game-grid">
          <article className="song-lyric-card">
            <div className="song-question-top"><span><i /> {question.title}</span>{started && !result && <em>السؤال شغال</em>}</div>
            {!started ? <div className="song-start-state"><span className="song-play-orb">▶</span><h2>مستعد تسمع وتكمل؟</h2><p>السؤال والاختيارات هيظهروا بعد ما تدوس ابدأ، والوقت هيبدأ فورًا لمدة 40 ثانية.</p>{error && <div className="error-text">{error}</div>}<ShakeButton className="btn btn-gold song-start-button" onClick={startQuestion} disabled={busy}>{busy ? "جاري البدء…" : "ابدأ السؤال"}</ShakeButton></div> : <>
              <div className="song-lyric-line">{promptParts[0]}<span>؟</span>{promptParts[1]}</div>
              <div className="song-answer-grid">{(question.options || []).map((option, index) => <button key={index} className={`song-answer ${result && index === result.correctIndex ? "correct" : ""} ${result && index !== result.correctIndex && !result.correct ? "muted-answer" : ""}`} onClick={() => void submit("answer", index)} disabled={busy || Boolean(result)}><i>{["أ", "ب", "ج", "د"][index]}</i>{option}</button>)}</div>
              {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
              {result && <div className={`song-result ${result.correct ? "correct" : "wrong"}`}><span>{result.correct ? "✓" : "!"}</span><div><strong>{result.correct ? `صح! كسبت ${result.pointsEarned} نقاط أغاني` : result.timedOut ? `الوقت خلص — خدت ${result.pointsEarned} نقطة أغاني` : `إجابة غلط — خدت ${result.pointsEarned} نقطة أغاني`}</strong><p>{result.fullLine}</p></div></div>}
              {result && <div className="song-result-actions">{result.fullAudioUrl && <button className="song-audio-link" onClick={() => playAudio(result.fullAudioUrl)}>{audioPlaying ? "♫ المقطع شغال" : "▶ اسمع الجملة كاملة"}</button>}<button className="song-next" onClick={() => void loadQuestion()}>السؤال التالي ←</button></div>}
            </>}
          </article>
          <aside className={`song-audio-card ${audioPlaying ? "playing" : ""}`}><div><span className="song-eyebrow">المقطع الصوتي</span><h2>اسمع قبل ما تختار</h2></div><div className="song-disc"><i>♪</i></div><div className="song-wave">{[17, 31, 43, 26, 38, 20, 47, 30, 40, 22, 35].map((height, index) => <span key={index} style={{ height, animationDelay: `${index * 0.05}s` }} />)}</div><button className="song-play-button" disabled={!started || Boolean(result)} onClick={() => playAudio(question.introAudioUrl)}>{audioPlaying ? "♫ المقطع شغال" : "▶ شغّل الجزء الناقص"}</button><p>{started && !result ? "اختار قبل ما الوقت يخلص. السؤال التالي مش هيفتح غير بعد إجابتك." : "المقطع يترفع من تبويب كمل الأغنية في الأدمن."}</p></aside>
        </div>}
      </section>
    </AppShell>
  );
}
