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
  equippedFrameColor?: string | null;
} | null;

// نفس ترتيب الجوايز اللي في lib السيرفر، لازم يفضل متطابق عشان العجلة توقف صح
const SEGMENTS = [
  { reward: 1, label: "1", color: "#7c9cf0" },
  { reward: 2, label: "2", color: "#f08ad0" },
  { reward: 3, label: "3", color: "#7ce0c0" },
  { reward: 5, label: "5", color: "#f0c96a" },
  { reward: 7, label: "7", color: "#e08a5c" },
  { reward: 10, label: "10", color: "#a58af0" },
  { reward: 15, label: "15", color: "#5cc8e0" },
  { reward: 20, label: "20", color: "#f06a6a" },
  { reward: 0, label: "😅", color: "#5a5a63" }
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function buildConicGradient() {
  const stops: string[] = [];
  SEGMENTS.forEach((s, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = start + SEGMENT_ANGLE;
    stops.push(`${s.color} ${start}deg ${end}deg`);
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function WheelPage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [canSpin, setCanSpin] = useState(false);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
  }

  async function loadStatus() {
    const res = await fetch("/api/wheel", { cache: "no-store" });
    const data = await res.json();
    setCanSpin(!!data.canSpin);
    setLastReward(data.lastReward ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
    loadStatus();
  }, []);

  async function spin() {
    if (spinning || !canSpin) return;
    setError("");
    setSpinning(true);
    setResult(null);

    const res = await fetch("/api/wheel", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setSpinning(false);
      setError(data.error || "حصل خطأ");
      loadStatus();
      return;
    }

    const reward = data.reward as number;
    const segmentIndex = SEGMENTS.findIndex((s) => s.reward === reward);
    const segmentCenter = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const desiredFinal = (360 - segmentCenter) % 360;
    const prevMod = ((rotation % 360) + 360) % 360;
    const delta = ((desiredFinal - prevMod) % 360 + 360) % 360;
    const fullSpins = 5;
    const targetRotation = rotation + fullSpins * 360 + delta;

    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(reward);
      setCanSpin(false);
      setLastReward(reward);
      vibrate(reward > 0 ? HAPTIC.win : HAPTIC.tap);
      if (reward > 0) {
        setMe((prev) => (prev ? { ...prev, coins: (prev.coins || 0) + reward } : prev));
      }
    }, 4200);
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
      <div className="title-row wheel-title-row">
        <div>
          <h2 style={{ margin: 0 }}>عجلة الحظ اليومية 🎡</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            لفة واحدة مجانية كل يوم، جرب حظك في كوينات مجانية
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        <div className="wheel-stage">
          <div className="wheel-machine">
            <span className="wheel-pointer" aria-hidden="true" />
            <div className={`lucky-wheel ${spinning ? "is-spinning" : ""}`} style={{ background: buildConicGradient(), transform: `rotate(${rotation}deg)` }}>
              {SEGMENTS.map((s, i) => {
                const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                return (
                  <div
                    key={i}
                    className="wheel-segment-label"
                    style={{ transform: `rotate(${angle}deg) translate(0, -112px) rotate(${-angle}deg)` }}
                  >
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <span className="wheel-hub">✦</span>
            {Array.from({ length: 10 }).map((_, index) => <i className="wheel-light" style={{ transform: `rotate(${index * 36}deg) translateY(-47%)` }} key={index} />)}
          </div>

          {error && <div className="error-text">{error}</div>}

          {result !== null ? (
            <div className={`wheel-result ${result > 0 ? "won" : "missed"}`}>
              {result > 0 ? `🎉 مبروك! كسبت ${result} كوين` : "😅 حظ أوفر بكرة"}
            </div>
          ) : !canSpin ? (
            <div className="wheel-result missed">
              {lastReward !== null && lastReward > 0
                ? `لفيت النهاردة وكسبت ${lastReward} كوين`
                : lastReward === 0
                ? "لفيت النهاردة، حظ أوفر بكرة"
                : "لفيت النهاردة خلاص"}
              — ارجع بكرة 🔁
            </div>
          ) : null}

          <ShakeButton className="btn btn-gold wheel-spin-button" onClick={spin} disabled={!canSpin || spinning}>
            {spinning ? "بتلف..." : canSpin ? "لف العجلة" : "ارجع بكرة"}
          </ShakeButton>
        </div>
      )}
    </AppShell>
  );
}
