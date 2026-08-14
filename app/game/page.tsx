"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import { vibrate, HAPTIC } from "../../lib/haptics";

type Question = {
  id: string;
  description: string;
  hintUnlocked: boolean;
  hint?: string;
};

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

export default function GamePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [qRes, meRes] = await Promise.all([
      fetch("/api/questions", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" })
    ]);
    const qData = await qRes.json();
    const meData = await meRes.json();
    setQuestions(qData.questions || []);
    setMe(meData.user);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitGuess(id: string) {
    const guess = guesses[id];
    if (!guess) return;
    setBusy(id);
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id, guess })
    });
    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setMessages((m) => ({ ...m, [id]: data.error || "حصل خطأ" }));
      return;
    }

    if (data.correct) {
      setMessages((m) => ({ ...m, [id]: "إجابة صح! +5 كوين و+1 نقطة" }));
      vibrate(HAPTIC.win);
      setMe((prev) => (prev ? { ...prev, points: data.points, coins: data.coins } : prev));
      setTimeout(() => {
        setQuestions((qs) => qs.filter((q) => q.id !== id));
      }, 900);
    } else {
      setMessages((m) => ({ ...m, [id]: "إجابة غلط، جرب تاني" }));
    }
  }

  async function skipQuestion(id: string) {
    setBusy(id);
    await fetch("/api/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id })
    });
    setBusy(null);
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  async function unlockHint(id: string) {
    setBusy(id);
    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id })
    });
    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setMessages((m) => ({ ...m, [id]: data.error || "حصل خطأ" }));
      return;
    }

    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, hintUnlocked: true, hint: data.hint } : q))
    );
    if (typeof data.coins === "number") {
      setMe((prev) => (prev ? { ...prev, coins: data.coins } : prev));
    }
  }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}
    >
      <div className="title-row">
        <div>
          <h2 style={{ margin: 0 }}>خمن الطالب</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            اقرا الوصف واكتب اسم الطالب، إجابة صح = 5 كوين و1 نقطة، والتلميح بـ10 كوين
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : questions.length === 0 ? (
        <div className="card empty">مفيش أسئلة دلوقتي، تابعنا هيتضاف قريب</div>
      ) : (
        <div className="list">
          {questions.map((q) => (
            <div className="card" key={q.id}>
              <p style={{ marginTop: 0, fontSize: 17 }}>{q.description}</p>

              {q.hintUnlocked && q.hint && (
                <div className="badge badge-coin" style={{ marginBottom: 14 }}>
                  💡 {q.hint}
                </div>
              )}

              {messages[q.id] && (
                <div
                  className={
                    messages[q.id].includes("صح") ? "success-text" : "error-text"
                  }
                >
                  {messages[q.id]}
                </div>
              )}

              <div className="field">
                <input
                  className="input"
                  placeholder="اكتب اسم الطالب هنا"
                  value={guesses[q.id] || ""}
                  onChange={(e) =>
                    setGuesses((g) => ({ ...g, [q.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitGuess(q.id);
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <ShakeButton
                  className="btn btn-gold"
                  onClick={() => submitGuess(q.id)}
                  disabled={busy === q.id}
                >
                  تأكيد الإجابة
                </ShakeButton>
                {!q.hintUnlocked && (
                  <ShakeButton
                    className="btn btn-outline"
                    onClick={() => unlockHint(q.id)}
                    disabled={busy === q.id}
                  >
                    تلميح (10 🪙)
                  </ShakeButton>
                )}
                <ShakeButton
                  className="btn btn-outline"
                  onClick={() => skipQuestion(q.id)}
                  disabled={busy === q.id}
                >
                  تخطي ⏭️
                </ShakeButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
