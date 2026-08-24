// Style reminder: the public profile shares the collectible player-card identity—clear Arabic hierarchy, gold-and-mint signals, and an uncluttered mobile layout.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import PlayerCard from "../../../components/PlayerCard";
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
          <PlayerCard
            nickname={profile.nickname}
            school={profile.school}
            initial={initial}
            avatarUrl={profile.avatar_url}
            frameColor={profile.equippedFrameColor}
            equippedTitle={profile.equippedTitle}
            level={level}
            totalPoints={totalPoints}
            coins={profile.coins}
            points={profile.points || 0}
            dailyPoints={profile.daily_points || 0}
            nextLevel={nextLevel}
            progressPct={progressPct}
            isLegendary={isLegendary}
          />
          <div className="ka-public-profile-meta">
            <span>عضو من {formatJoinDate(profile.created_at)}</span>
            {profile.instagram_username && (
              <a href={instagramProfileUrl(profile.instagram_username)} target="_blank" rel="noopener noreferrer">
                📸 @{profile.instagram_username}
              </a>
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
