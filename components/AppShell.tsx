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
      <div className="topbar ka-topbar">
        <a className="ka-brand" href="/profile" aria-label="K.A Juniors - البروفايل">
          <span className="ka-brand-monogram" aria-hidden="true"><b>K</b><i>A</i></span>
          <span className="ka-brand-copy"><b>KA</b><small>Juniors</small></span>
          <span className="ka-brand-bubble" aria-hidden="true">✦</span>
        </a>
        <div className="ka-topbar-actions">
          <button className="games-navigator" onClick={() => setMenuOpen(true)} aria-label="فتح كل الألعاب" aria-expanded={menuOpen}>
            <span className="games-navigator-icon" aria-hidden="true"><i /><i /><i /><i /></span>
            <span><b>كل الألعاب</b><small>اختار مغامرتك</small></span>
          </button>
          {onlineCount !== null && (
            <span className="badge online-badge" title="متصلين الآن">
              <span className="online-dot" />
              {onlineCount}
            </span>
          )}
          <span className="badge badge-point">⭐ {totalPoints}</span>
          <span className="badge badge-coin">🪙 {coins ?? 0}</span>
          <a href="/profile" className="ka-profile-shortcut" aria-label="فتح البروفايل">
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
          </a>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 90, flex: 1 }}>
        {children}
      </div>

      {menuOpen && (
        <div className="menu-sheet-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet ka-games-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="كل الألعاب">
            <div className="menu-sheet-handle" />
            <div className="ka-games-sheet-heading"><div><span>دليل K.A Juniors</span><h3 className="menu-sheet-title">اختار اللعبة اللي على مزاجك</h3></div><button onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة">×</button></div>
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
