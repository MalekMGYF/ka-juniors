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
  const [burst, setBurst] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([]);

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
    const school = mySchool;
    if (!school) return;
    setPop(true);
    setTimeout(() => setPop(false), 220);
    setBurst((value) => value + 1);
    const heartId = Date.now() + Math.random();
    setFloatingHearts((hearts) => [...hearts.slice(-7), { id: heartId, x: 28 + Math.random() * 44 }]);
    setTimeout(() => setFloatingHearts((hearts) => hearts.filter((heart) => heart.id !== heartId)), 900);
    vibrate(HAPTIC.tap);
    setCounts((c) => ({ ...c, [school]: (c[school] || 0) + 1 }));
    try {
      const response = await fetch("/api/cheer", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setCounts((c) => ({ ...c, [school]: Math.max(0, (c[school] || 0) - 1) }));
        return;
      }
      if (typeof data.count === "number") setCounts((c) => ({ ...c, [school]: Math.max(c[school] || 0, data.count) }));
    } catch {
      setCounts((c) => ({ ...c, [school]: Math.max(0, (c[school] || 0) - 1) }));
    }
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
          <section className="cheer-arena">
            <div className="cheer-arena-head"><span>مدرج التشجيع</span><b>بتشجع {mySchool || "مدرستك"}</b><small>دوس براحتك، كل ضغطة بتتحسب</small></div>
            <div className="cheer-heart-stage">
              {floatingHearts.map((heart) => <span key={heart.id} className="cheer-float-heart" style={{ left: `${heart.x}%` }}>♥</span>)}
            <button
              className={`cheer-heart-button ${pop ? "is-popping" : ""}`}
              onClick={tap}
              disabled={!mySchool}
              aria-label="شجع مدرستك"
            >
              <span>♥</span>
            </button>
            </div>
            <div className="cheer-live-score"><small>تشجيعات مدرستك</small><strong>{counts[mySchool || ""] || 0}</strong><span>{burst > 0 ? `آخر سبام: ${burst} قلب` : "جاهز للتشجيع؟"}</span></div>
          </section>

          <section className="cheer-rank-board">
            <div className="cheer-rank-heading"><div><span>لوحة المدرجات</span><h3>ترتيب التكبيس</h3></div><small>بيتحدث كل شوية</small></div>
            <div className="list">
              {ranked.map((s, i) => (
                <div className={`row cheer-school-row ${i === 0 ? "leader" : ""}`} key={s.name}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`rank ${i === 0 ? "top1" : i === 1 ? "top2" : "top3"}`}>
                      {i + 1}
                    </span>
                    <span className="school-dot" style={{ background: s.color }} />
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                  </div>
                  <span className="cheer-count" style={{ color: s.color }}>♥ {s.count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
