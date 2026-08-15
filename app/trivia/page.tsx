"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import { vibrate, HAPTIC } from "../../lib/haptics";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedFrameColor?: string | null;
} | null;

type Question = {
  id: string;
  question_text?: string;
  options?: string[];
};

const ANSWER_WINDOW_SECONDS = 10;

export default function TriviaPage() {
  const [me, setMe] = useState<Me>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(ANSWER_WINDOW_SECONDS);
  const [expired, setExpired] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    correctIndex: number;
    pointsEarned: number;
    coinsEarned: number;
    selectedIndex: number;
  } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
  }

  async function loadQuestion() {
    setLoading(true);
    setLastResult(null);
    const res = await fetch("/api/trivia", { cache: "no-store" });
    const data = await res.json();
    setQuestion(data.question);
    setLoading(false);
    setError("");

    if (data.question && data.myStart) {
      // كان بدأ قبل كده (مثلا عمل رفرش للصفحة)، كمّل من نفس الوقت
      const startedAt = new Date(data.myStart).getTime();
      const serverNow = new Date(data.serverNow).getTime();
      const elapsedSec = (serverNow - startedAt) / 1000;
      const remaining = Math.max(0, ANSWER_WINDOW_SECONDS - elapsedSec);
      setStarted(true);
      setSecondsLeft(Math.ceil(remaining));
      setExpired(remaining <= 0);
    } else {
      setStarted(false);
      setExpired(false);
      setSecondsLeft(ANSWER_WINDOW_SECONDS);
    }
  }

  useEffect(() => {
    loadMe();
    loadQuestion();
  }, []);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!question || !started || expired) return;

    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setExpired(true);
          if (tickRef.current) clearInterval(tickRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, started, expired]);

  async function startQuestion() {
    if (!question) return;
    setStarting(true);
    setError("");
    const res = await fetch("/api/trivia/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id })
    });
    const data = await res.json();
    setStarting(false);

    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }

    vibrate(HAPTIC.tap);
    await loadQuestion();
  }

  async function pick(index: number) {
    if (!question || selecting || expired || !started) return;
    setSelecting(true);
    setError("");

    const res = await fetch("/api/trivia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, selectedIndex: index })
    });
    const data = await res.json();
    setSelecting(false);

    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      if (data.error?.includes("العشر ثواني")) {
        setExpired(true);
      }
      return;
    }

    vibrate(data.correct ? HAPTIC.win : 40);
    setLastResult({
      correct: data.correct,
      correctIndex: data.correctIndex,
      pointsEarned: data.pointsEarned,
      coinsEarned: data.coinsEarned,
      selectedIndex: index
    });
    loadMe();

    // بعد شوية، هاته السؤال اللي بعده تلقائي
    setTimeout(() => {
      loadQuestion();
    }, 1800);
  }

  async function nextQuestion() {
    if (!question || selecting || !expired) return;
    setSelecting(true);
    setError("");
    const res = await fetch("/api/trivia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, skipExpired: true })
    });
    const data = await res.json();
    setSelecting(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ، جرب تاني");
      return;
    }
    vibrate(HAPTIC.tap);
    await loadQuestion();
  }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      <h2 style={{ margin: "0 0 4px" }}>تحدي المعلومات ❓</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
        دوس "ابدأ" وعندك عشر ثواني تجاوب — كل ما تجاوب بسرعة كل ما تكسب نقط وكوينات أكتر.
      </p>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !question ? (
        <div className="card empty">
          {lastResult ? "برافو! خلصت كل الأسئلة المتاحة دلوقتي" : "مفيش أسئلة متاحة دلوقتي، استنى الأدمن يضيف أسئلة جديدة"}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 22 }}>
          {started && !lastResult && !expired && (
            <div
              style={{
                textAlign: "center",
                fontSize: 34,
                fontWeight: 900,
                color: secondsLeft <= 3 ? "var(--coral)" : "var(--gold)",
                marginBottom: 14
              }}
            >
              {secondsLeft}
            </div>
          )}

          {error && <div className="error-text">{error}</div>}

          {!started ? (
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <ShakeButton className="btn btn-gold" onClick={startQuestion} disabled={starting}>
                {starting ? "جاري البدء..." : "ابدأ"}
              </ShakeButton>
            </div>
          ) : (
            <>
              <h3 style={{ marginTop: 0, textAlign: "center" }}>{question.question_text}</h3>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {(question.options || []).map((opt, idx) => {
                  const isMine = lastResult?.selectedIndex === idx;
                  const showCorrect = lastResult && lastResult.correctIndex === idx;
                  let style: React.CSSProperties = {
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg-soft)",
                    color: "var(--text)",
                    textAlign: "right",
                    fontSize: 15,
                    fontFamily: "inherit",
                    fontWeight: 700,
                    cursor: "pointer"
                  };
                  if (showCorrect) {
                    style.border = "1px solid var(--mint)";
                    style.background = "rgba(124, 224, 192, 0.12)";
                    style.color = "var(--mint)";
                  }
                  if (isMine && !showCorrect) {
                    style.border = "1px solid var(--coral)";
                    style.background = "rgba(255, 107, 107, 0.12)";
                    style.color = "#ffd2d2";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => pick(idx)}
                      disabled={!!lastResult || expired || selecting}
                      style={style}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {lastResult && (
                <div
                  className={lastResult.correct ? "success-text" : "error-text"}
                  style={{ marginTop: 16, textAlign: "center", fontSize: 15 }}
                >
                  {lastResult.correct
                    ? `🎉 جاوبت صح! كسبت ${lastResult.pointsEarned} نقطة و${lastResult.coinsEarned} كوين`
                    : "😅 للأسف غلط، حظ أوفر المرة الجاية"}
                </div>
              )}

              {!lastResult && expired && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <div className="muted" style={{ marginBottom: 12 }}>
                    خلص الوقت على السؤال ده
                  </div>
                  <ShakeButton className="btn btn-gold" onClick={nextQuestion} disabled={selecting}>
                    {selecting ? "جاري تحميل السؤال…" : "السؤال التالي ←"}
                  </ShakeButton>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </AppShell>
  );
}
