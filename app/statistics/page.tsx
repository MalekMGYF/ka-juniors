"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedFrameColor?: string | null;
} | null;

type Overview = {
  totalStudents: number;
  totalCorrectGuesses: number;
  totalChatMessages: number;
  topSchool: { name: string; count: number } | null;
} | null;

export default function StatisticsPage() {
  const [me, setMe] = useState<Me>(null);
  const [overview, setOverview] = useState<Overview>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [meRes, overviewRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/statistics", { cache: "no-store" })
      ]);
      const meData = await meRes.json();
      const overviewData = await overviewRes.json();
      setMe(meData.user);
      setOverview(overviewData);
    } catch (e) {
      console.error("statistics load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      <div className="title-row">
        <div>
          <h2 style={{ margin: 0 }}>الإحصائيات 📊</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            أرقام الموقع كله لحظة بلحظة
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        overview && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="profile-stat" style={{ flex: "1 1 45%" }}>
              <div className="profile-stat-value" style={{ color: "var(--mint)" }}>
                {overview.totalStudents}
              </div>
              <div className="profile-stat-label">طالب مسجل</div>
            </div>
            <div className="profile-stat" style={{ flex: "1 1 45%" }}>
              <div className="profile-stat-value" style={{ color: "var(--gold)" }}>
                {overview.totalCorrectGuesses}
              </div>
              <div className="profile-stat-label">إجابة صح في خمن الطالب</div>
            </div>
            <div className="profile-stat" style={{ flex: "1 1 45%" }}>
              <div className="profile-stat-value" style={{ color: "var(--text)" }}>
                {overview.totalChatMessages}
              </div>
              <div className="profile-stat-label">رسالة في الشات</div>
            </div>
            <div className="profile-stat" style={{ flex: "1 1 45%" }}>
              <div className="profile-stat-value" style={{ fontSize: 14 }}>
                {overview.topSchool?.name || "—"}
              </div>
              <div className="profile-stat-label">أكتر مدرسة تكبيس</div>
            </div>
          </div>
        )
      )}
    </AppShell>
  );
}
