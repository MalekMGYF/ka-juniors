"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLevel } from "../lib/levels";

export default function AppShell({
  nickname,
  coins,
  points,
  dailyPoints,
  avatarUrl,
  frameColor,
  children
}: {
  nickname?: string;
  coins?: number;
  points?: number;
  dailyPoints?: number;
  avatarUrl?: string | null;
  frameColor?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  const initial = nickname ? nickname.trim().charAt(0) : "؟";
  const totalPoints = (points ?? 0) + (dailyPoints ?? 0);
  const level = getLevel(totalPoints);

  useEffect(() => {
    function beat() {
      fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    }
    function refreshOnlineCount() {
      fetch("/api/online-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setOnlineCount(d.count))
        .catch(() => {});
    }
    beat();
    refreshOnlineCount();
    const beatInterval = setInterval(beat, 60000);
    const countInterval = setInterval(refreshOnlineCount, 30000);
    return () => {
      clearInterval(beatInterval);
      clearInterval(countInterval);
    };
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { href: "/profile", label: "البروفايل", icon: "👤" },
    { href: "/leaderboard", label: "الترتيب", icon: "🏆" },
    { href: "/game", label: "خمن الطالب", icon: "🎯" },
    { href: "/daily", label: "السؤال اليومي", icon: "📅" },
    { href: "/cheer", label: "تكبيس", icon: "❤️" },
    { href: "/wheel", label: "عجلة الحظ", icon: "🎡" },
    { href: "/memory", label: "تحدي الذاكرة", icon: "🧠" },
    { href: "/trivia", label: "تحدي المعلومات", icon: "❓" },
    { href: "/songs", label: "كمل الأغنية", icon: "🎤" },
    { href: "/pictionary", label: "ارسم واتقال", icon: "✎" },
    { href: "/mafioso", label: "مافيوسو", icon: "🕵️" },
    { href: "/chat", label: "الشات العام", icon: "💬" },
    { href: "/statistics", label: "الإحصائيات", icon: "📊" }
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="page">
      <div className="topbar">
        <div className="logo-mark">
          <span className="ka-game-mark" aria-hidden="true"><i>✎</i><b>✦</b></span>
          <span>K.A Juniors</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onlineCount !== null && (
            <span className="badge online-badge">
              <span className="online-dot" />
              {onlineCount}
            </span>
          )}
          <span className="badge badge-point">⭐ {totalPoints}</span>
          <span className="badge badge-coin">🪙 {coins ?? 0}</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div className="avatar" style={frameColor ? { border: `2.5px solid ${frameColor}` } : undefined}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nickname}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <span style={{ fontSize: 10, color: level.color, fontWeight: 700 }}>
              {level.icon} {level.name}
            </span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 90, flex: 1 }}>
        {children}
      </div>

      <button
        className="menu-fab"
        onClick={() => setMenuOpen(true)}
        aria-label="فتح قائمة الألعاب"
      >
        <span className="menu-fab-dots">⋯</span>
      </button>

      {menuOpen && (
        <div className="menu-sheet-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="menu-sheet-handle" />
            <h3 className="menu-sheet-title">فين عايز تروح؟</h3>
            <div className="menu-grid">
              {tabs.map((tab) => (
                <a
                  key={tab.href}
                  href={tab.href}
                  className={`menu-grid-item ${pathname === tab.href ? "active" : ""}`}
                >
                  <span className="menu-grid-icon">{tab.icon}</span>
                  <span className="menu-grid-label">{tab.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
