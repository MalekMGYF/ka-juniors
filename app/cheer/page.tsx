"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { SCHOOLS, getSchoolColor } from "../../lib/schools";
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

export default function CheerPage() {
  const [me, setMe] = useState<Me>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mySchool, setMySchool] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pop, setPop] = useState(false);

  async function load() {
    const [cRes, meRes] = await Promise.all([
      fetch("/api/cheer", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" })
    ]);
    const cData = await cRes.json();
    const meData = await meRes.json();
    setCounts(cData.counts || {});
    setMySchool(cData.mySchool);
    setMe(meData.user);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function tap() {
    setPop(true);
    setTimeout(() => setPop(false), 220);
    vibrate(HAPTIC.tap);
    setCounts((c) => ({ ...c, [mySchool || ""]: (c[mySchool || ""] || 0) + 1 }));
    await fetch("/api/cheer", { method: "POST" });
  }

  const ranked = SCHOOLS.map((s) => ({ ...s, count: counts[s.name] || 0 })).sort(
    (a, b) => b.count - a.count
  );

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
          <h2 style={{ margin: 0 }}>تكبيس المدارس</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            دوس على القلب وشجع مدرستك، مفيش حد أقصى
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        <>
          <div className="card" style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="muted" style={{ marginBottom: 10 }}>بتشجع</div>
            <div style={{ fontFamily: "Marhey, sans-serif", fontWeight: 700, fontSize: 19, marginBottom: 20 }}>
              {mySchool || "—"}
            </div>
            <button
              onClick={tap}
              disabled={!mySchool}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 90,
                transform: pop ? "scale(1.25)" : "scale(1)",
                transition: "transform 0.15s ease",
                lineHeight: 1
              }}
            >
              ❤️
            </button>
            <div style={{ marginTop: 14, fontFamily: "Marhey, sans-serif", fontWeight: 700, fontSize: 22 }}>
              {counts[mySchool || ""] || 0}
            </div>
          </div>

          <h3>ترتيب التكبيس</h3>
          <div className="card card-tight">
            <div className="list">
              {ranked.map((s, i) => (
                <div className="row" key={s.name}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`rank ${i === 0 ? "top1" : i === 1 ? "top2" : "top3"}`}>
                      {i + 1}
                    </span>
                    <span className="school-dot" style={{ background: s.color }} />
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                  </div>
                  <span className="badge" style={{ color: s.color }}>❤️ {s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
