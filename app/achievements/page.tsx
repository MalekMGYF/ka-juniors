"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

type AchievementResult = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export default function AchievementsPage() {
  const [me, setMe] = useState<Me>(null);
  const [achievements, setAchievements] = useState<AchievementResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [meRes, achRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/achievements", { cache: "no-store" })
    ]);
    const meData = await meRes.json();
    const achData = await achRes.json();
    setMe(meData.user);
    setAchievements(achData.achievements || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

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
          <h2 style={{ margin: 0 }}>الإنجازات</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {loading ? "جاري التحميل..." : `فتحت ${unlockedCount} من ${achievements.length}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        <div className="list">
          {achievements.map((a) => (
            <div
              className="card card-tight"
              key={a.id}
              style={{ opacity: a.unlocked ? 1 : 0.45 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: a.unlocked ? "var(--surface-2)" : "var(--bg-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 21,
                    border: a.unlocked ? "1.5px solid var(--gold)" : "1px solid var(--border)"
                  }}
                >
                  {a.unlocked ? a.icon : "🔒"}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{a.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
