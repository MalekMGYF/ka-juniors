"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function getParts(ms: number): Parts {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export default function CountdownPage() {
  const [next, setNext] = useState("/");
  const [loading, setLoading] = useState(true);
  const [launchAt, setLaunchAt] = useState<string | null>(null);
  const [parts, setParts] = useState<Parts>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/");
  }, []);

  useEffect(() => {
    fetch("/api/launch-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLaunchAt(d.launchAt);
        setLaunched(!d.isBeforeLaunch);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!launchAt) return;
    const target = new Date(launchAt).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLaunched(true);
        setParts({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setParts(getParts(diff));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [launchAt]);

  const cells: { label: string; value: number }[] = [
    { label: "يوم", value: parts.days },
    { label: "ساعة", value: parts.hours },
    { label: "دقيقة", value: parts.minutes },
    { label: "ثانية", value: parts.seconds }
  ];

  return (
    <div className="hero">
      <div className="hero-top">
        <div className="logo-mark">
          <span className="spark">✦</span>
          K.A Juniors
        </div>
      </div>

      <div className="hero-body">
        {loading ? (
          <p className="hero-sub">جاري التحميل...</p>
        ) : launched ? (
          <>
            <h1 className="hero-title">اتفتح الموقع 🎉</h1>
            <p className="hero-sub">يلا بينا! دوس تحت عشان تدخل K.A Juniors</p>
            <div className="hero-actions">
              <a href={next} className="btn btn-gold">
                ادخل الموقع
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className="hero-title">استنونا شوية...</h1>
            <p className="hero-sub">
              منصة K.A Juniors هتفتح قريب، جهز نفسك عشان تجمع نقط وكوينات وتتصدر
              الترتيب مع زمايلك 🔥
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 24,
                marginBottom: 24
              }}
            >
              {cells.map((c) => (
                <div
                  key={c.label}
                  className="card card-tight"
                  style={{ minWidth: 78, textAlign: "center" }}
                >
                  <div
                    style={{
                      fontFamily: "Marhey, sans-serif",
                      fontWeight: 700,
                      fontSize: 30,
                      color: "var(--gold)",
                      lineHeight: 1.1
                    }}
                  >
                    {String(c.value).padStart(2, "0")}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
