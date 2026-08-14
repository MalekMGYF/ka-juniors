"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { LEVELS, getLevelIndex } from "../../lib/levels";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

export default function LevelsPage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totalPoints = (me?.points ?? 0) + (me?.daily_points ?? 0);
  const currentIndex = getLevelIndex(totalPoints);

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
          <h2 style={{ margin: 0 }}>المستويات</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            كل ما نقطك تزيد، لقبك بيترقى تلقائي
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        <div className="list">
          {LEVELS.map((lvl, i) => {
            const isCurrent = i === currentIndex;
            const isUnlocked = totalPoints >= lvl.minPoints;
            return (
              <div
                className="card card-tight"
                key={lvl.name}
                style={{
                  borderColor: isCurrent ? lvl.color : undefined,
                  opacity: isUnlocked ? 1 : 0.55
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "var(--surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 19,
                        border: `1.5px solid ${lvl.color}`
                      }}
                    >
                      {lvl.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: isCurrent ? lvl.color : "var(--text)" }}>
                        {lvl.name}
                        {isCurrent && <span style={{ fontSize: 11 }}> (مستواك الحالي)</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        محتاج {lvl.minPoints} نقطة
                      </div>
                    </div>
                  </div>
                  {isUnlocked && <span style={{ color: lvl.color }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
