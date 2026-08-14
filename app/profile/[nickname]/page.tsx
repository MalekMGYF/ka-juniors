"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { getLevel, getLevelIndex, getNextLevel, LEVELS } from "../../../lib/levels";
import { getSchoolColor } from "../../../lib/schools";
import { instagramProfileUrl } from "../../../lib/instagram";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

type PublicProfile = {
  nickname: string;
  full_name: string;
  school: string;
  points: number;
  coins: number;
  daily_points: number;
  avatar_url?: string | null;
  instagram_username?: string | null;
  created_at: string;
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

function formatJoinDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export default function PublicProfilePage() {
  const params = useParams<{ nickname?: string }>();
  const router = useRouter();
  const nickname = decodeURIComponent(params?.nickname || "");

  const [me, setMe] = useState<Me>(null);
  const [profile, setProfile] = useState<PublicProfile>(null);
  const [achievements, setAchievements] = useState<AchievementResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const [meRes, profileRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch(`/api/public-profile/${encodeURIComponent(nickname)}`, { cache: "no-store" })
    ]);
    const meData = await meRes.json();
    setMe(meData.user);

    if (!profileRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await profileRes.json();
    setProfile(data.profile);
    setAchievements(data.achievements || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname]);

  const totalPoints = profile ? profile.points + profile.daily_points : 0;
  const level = getLevel(totalPoints);
  const levelIdx = getLevelIndex(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const isLegendary = levelIdx >= LEVELS.length - 3;
  const initial = profile?.nickname ? profile.nickname.trim().charAt(0) : "؟";
  const schoolColor = getSchoolColor(profile?.school);

  const progressPct = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
        )
      )
    : 100;

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}
    >
      <button
        onClick={() => router.back()}
        className="nav-link"
        style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", marginBottom: 16 }}
      >
        ← رجوع
      </button>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : notFound || !profile ? (
        <div className="card empty">الحساب ده مش موجود</div>
      ) : (
        <>
          <div
            className="public-profile-hero"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${level.color}22, var(--surface) 70%)`,
              border: `1px solid ${level.color}44`
            }}
          >
            <div
              className={`public-profile-avatar-wrap ${isLegendary && !profile.equippedFrameColor ? "frame-legendary" : ""}`}
              style={{ border: `3px solid ${profile.equippedFrameColor || level.color}` }}
            >
              <div className="avatar avatar-lg">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.nickname}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  initial
                )}
              </div>
            </div>

            <div style={{ fontFamily: "Marhey, sans-serif", fontWeight: 700, fontSize: 22 }}>
              {profile.nickname}
            </div>
            {profile.equippedTitle && (
              <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700, marginTop: 2 }}>
                ✦ {profile.equippedTitle}
              </div>
            )}
            <div style={{ fontSize: 13, color: level.color, fontWeight: 700, marginTop: 4 }}>
              {level.icon} {level.name}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 10,
                fontSize: 13
              }}
            >
              <span className="school-dot" style={{ background: schoolColor }} />
              <span className="muted">{profile.school}</span>
            </div>

            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              انضم في {formatJoinDate(profile.created_at)}
            </div>

            {profile.instagram_username && (
              <a
                href={instagramProfileUrl(profile.instagram_username)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ width: "auto", padding: "6px 16px", fontSize: 12, marginTop: 12, display: "inline-block" }}
              >
                📸 @{profile.instagram_username}
              </a>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--mint)" }}>
                  {totalPoints}
                </div>
                <div className="profile-stat-label">إجمالي النقط ⭐</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: "var(--gold)" }}>
                  {profile.coins}
                </div>
                <div className="profile-stat-label">الكوينات 🪙</div>
              </div>
            </div>

            {nextLevel ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 6
                  }}
                >
                  <span className="muted">باقي {nextLevel.minPoints - totalPoints} نقطة على {nextLevel.name}</span>
                  <span className="muted">{progressPct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%`, background: nextLevel.color }}
                  />
                </div>
              </>
            ) : (
              <div className="success-text" style={{ textAlign: "center", marginBottom: 0 }}>
                🎉 وصل لأعلى مستوى في الموقع
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 16 }}>
              الإنجازات ({achievements.filter((a) => a.unlocked).length}/{achievements.length})
            </h3>
            <div className="badge-mini-row">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="badge-mini"
                  title={a.title}
                  style={{
                    opacity: a.unlocked ? 1 : 0.3,
                    borderColor: a.unlocked ? "var(--gold)" : "var(--border)"
                  }}
                >
                  {a.unlocked ? a.icon : "🔒"}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
