"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import { vibrate, HAPTIC } from "../../lib/haptics";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

type Question = {
  id: string;
  question_text: string;
  nextRotationAt: string;
} | null;

type Submission = {
  id: string;
  answer_text: string;
  status: "pending" | "awarded" | "late" | "rejected";
} | null;

const STATUS_TEXT: Record<string, { text: string; className: string }> = {
  pending: { text: "إجابتك قيد المراجعة من الأدمن", className: "muted" },
  awarded: { text: "🎉 إجابة صح! كسبت 5 نقاط", className: "success-text" },
  late: { text: "إجابتك صح، بس سبقك 5 ناس قبلك", className: "muted" },
  rejected: { text: "للأسف إجابتك مش صح", className: "error-text" }
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailyPage() {
  const [me, setMe] = useState<Me>(null);
  const [question, setQuestion] = useState<Question>(null);
  const [submission, setSubmission] = useState<Submission>(null);
  const [closed, setClosed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");

  async function load() {
    const [dRes, meRes] = await Promise.all([
      fetch("/api/daily", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" })
    ]);
    const dData = await dRes.json();
    const meData = await meRes.json();
    setQuestion(dData.question);
    setSubmission(dData.mySubmission);
    setClosed(dData.closed || false);
    setMe(meData.user);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!question?.nextRotationAt) return;
    const target = new Date(question.nextRotationAt).getTime();
    const tick = () => setCountdown(formatCountdown(target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [question?.nextRotationAt]);

  async function submit() {
    if (!answer.trim()) return;
    setError("");
    setBusy(true);
    const res = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText: answer })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    vibrate(HAPTIC.tap);
    load();
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
          <h2 style={{ margin: 0 }}>السؤال اليومي</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            أول 5 إجابات صح ياخدوا 5 نقاط لكل واحد
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !question ? (
        <div className="card empty">مفيش سؤال يومي دلوقتي، تابعنا هيتضاف قريب</div>
      ) : (
        <div className="card">
          <p style={{ marginTop: 0, fontSize: 17 }}>{question.question_text}</p>

          {countdown && (
            <div style={{ marginBottom: 16 }}>
              <span className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                باقي على السؤال الجاي
              </span>
              <span className="countdown-box">⏳ {countdown}</span>
            </div>
          )}

          {submission ? (
            <>
              <div className="field">
                <label>إجابتك</label>
                <div className="badge" style={{ display: "block", padding: "12px 16px" }}>
                  {submission.answer_text}
                </div>
              </div>
              <div className={STATUS_TEXT[submission.status].className}>
                {STATUS_TEXT[submission.status].text}
              </div>
            </>
          ) : closed ? (
            <div className="muted">
              معلش، العدد المسموح بيه خلص. استنى السؤال الجاي بكرة ⏳
            </div>
          ) : (
            <>
              {error && <div className="error-text">{error}</div>}
              <div className="field">
                <input
                  className="input"
                  placeholder="اكتب إجابتك هنا"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <ShakeButton className="btn btn-gold" onClick={submit} disabled={busy}>
                {busy ? "جاري الإرسال..." : "أرسل إجابتك"}
              </ShakeButton>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
