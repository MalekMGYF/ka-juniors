// Style reminder: ranking is a focused midnight scoreboard; each category is a clear, tappable lane with gold reserved for achievement and mint for live intelligence.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { getLevel } from "../../lib/levels";
import { getSchoolColor } from "../../lib/schools";

type Player = {
  id: string;
  nickname: string;
  full_name: string;
  school: string;
  points: number;
  daily_points: number;
  trivia_points?: number;
  coins: number;
  avatar_url?: string | null;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
  pictionary_points?: number;
  song_points?: number;
  cheer_taps?: number;
  memory_plays?: number;
  wheel_spins?: number;
  activity_points?: number;
  general_score?: number;
};

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

type EventItem = {
  id: string;
  type: string;
  payload: string | null;
  users: { nickname: string } | null;
};

type SmartPlayer = { id: string; nickname: string; avatar_url?: string | null; trivia_points: number; equippedFrameColor?: string | null };

type RankingProfile = {
  id: string;
  nickname: string;
  school?: string;
  avatar_url?: string | null;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
};

type Tab = "overall" | "game" | "trivia" | "songs" | "pictionary" | "coins" | "schools" | "weekly";

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [weeklyPlayers, setWeeklyPlayers] = useState<
    { id: string; nickname: string; school: string; avatar_url?: string | null; weeklyScore: number }[]
  >([]);
  const [smartPlayers, setSmartPlayers] = useState<SmartPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overall");

  async function load() {
    const [lbRes, meRes, evRes, weeklyRes, smartRes] = await Promise.all([
      fetch("/api/leaderboard", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/events/recent", { cache: "no-store" }),
      fetch("/api/leaderboard/weekly", { cache: "no-store" }),
      fetch("/api/trivia/leaderboard", { cache: "no-store" })
    ]);
    const lb = await lbRes.json();
    const meData = await meRes.json();
    const evData = await evRes.json();
    const weeklyData = await weeklyRes.json();
    const smartData = await smartRes.json();
    setPlayers(lb.players || []);
    setMe(meData.user);
    setEvents(evData.events || []);
    setWeeklyPlayers(weeklyData.players || []);
    setSmartPlayers(smartData.players || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  function rankClass(i: number) {
    if (i === 0) return "rank top1";
    if (i === 1) return "rank top2";
    if (i === 2) return "rank top3";
    return "rank";
  }

  function eventText(e: EventItem) {
    const name = e.users?.nickname || "حد";
    if (e.type === "level_up") return `🎉 ${name} وصل لقب ${e.payload}`;
    if (e.type === "top_rank") return `🏆 ${name} اتصدر الترتيب العام`;
    return `${name} عمل حاجة حلوة`;
  }

  const generalScore = (player: Player) => player.general_score || 0;
  const sortedOverall = [...players].sort((a, b) => generalScore(b) - generalScore(a));
  const sortedGame = [...players].sort((a, b) => b.points - a.points);
  const sortedCoins = [...players].sort((a, b) => b.coins - a.coins);
  const sortedPictionary = [...players]
    .filter((player) => (player.pictionary_points || 0) > 0)
    .sort((a, b) => (b.pictionary_points || 0) - (a.pictionary_points || 0));
  const sortedSongs = [...players]
    .filter((player) => (player.song_points || 0) > 0)
    .sort((a, b) => (b.song_points || 0) - (a.song_points || 0));

  const schoolMap = new Map<string, { total: number; count: number }>();
  players.forEach((p) => {
    const total = generalScore(p);
    const entry = schoolMap.get(p.school) || { total: 0, count: 0 };
    entry.total += total;
    entry.count += 1;
    schoolMap.set(p.school, entry);
  });
  const schools = Array.from(schoolMap.entries())
    .map(([school, v]) => ({ school, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  function goToProfile(nickname: string) {
    router.push(`/profile/${encodeURIComponent(nickname)}`);
  }

  function renderRankingCard(
    p: RankingProfile,
    i: number,
    value: number,
    icon: string,
    valueLabel: string,
    details: ReactNode,
    level?: { icon: string; name: string; color: string }
  ) {
    const schoolColor = p.school ? getSchoolColor(p.school) : undefined;
    const isCurrentPlayer = p.nickname === me?.nickname;
    return (
      <button
        type="button"
        key={p.nickname}
        className={`leaderboard-player-card rank-card-${Math.min(i + 1, 4)}${isCurrentPlayer ? " is-current-player" : ""}`}
        onClick={() => goToProfile(p.nickname)}
      >
        <span className="leaderboard-rank-wrap">
          <span className={rankClass(i)}>{i + 1}</span>
          <small>{i === 0 ? "القمة" : i < 3 ? "الأوائل" : "المركز"}</small>
        </span>
        <span className="leaderboard-player-copy">
          <span className="leaderboard-card-avatar" style={{ borderColor: p.equippedFrameColor || (i === 0 ? "var(--gold)" : undefined) }}>
            {p.avatar_url ? <img src={p.avatar_url} alt="" /> : p.nickname.charAt(0)}
          </span>
          <span className="leaderboard-player-text">
            <span className="leaderboard-player-name">
              <strong>{p.nickname}</strong>
              {isCurrentPlayer && <em>أنت</em>}
            </span>
            <span className="leaderboard-player-meta">
              {level && <span style={{ color: level.color }}>{level.icon} {level.name}</span>}
              {p.equippedTitle && <span className="leaderboard-title-tag">✦ {p.equippedTitle}</span>}
              {p.school && <span><i className="school-dot" style={{ background: schoolColor }} />{p.school}</span>}
            </span>
            <span className="leaderboard-card-detail">{details}</span>
          </span>
        </span>
        <span className="leaderboard-card-score">
          <span>{icon}</span>
          <strong>{value}</strong>
          <small>{valueLabel}</small>
        </span>
        <span className="leaderboard-card-open" aria-hidden="true">‹</span>
      </button>
    );
  }

  function renderPlayerRow(p: Player, i: number, showValue: number, icon: string = "⭐") {
    const level = getLevel(tab === "overall" ? generalScore(p) : p.points + p.daily_points);
    const valueLabel = icon === "🪙" ? "كوين" : tab === "pictionary" ? "نقاط رسم" : tab === "overall" ? "درجة عامة" : "نقطة";
    const details = tab === "overall"
      ? <><span>🎮 {p.points} ألعاب</span><span>☀ {p.daily_points} يومي</span><span>🧠 {p.trivia_points || 0} معلومات</span><span>🔥 {p.activity_points || 0} تفاعل</span></>
      : <span>دوس لعرض البروفايل الكامل</span>;
    return renderRankingCard(p, i, showValue, icon, valueLabel, details, level);
  }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}
    >
      <div className="title-row leaderboard-title-row">
        <div>
          <span className="leaderboard-kicker">لوحة الشرف</span>
          <h2 style={{ margin: 0 }}>الترتيب</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            دوس على أي اسم عشان تشوف بروفايله كامل
          </p>
        </div>
      </div>

      {events.length > 0 && (
        <div className="event-card">
          <span style={{ fontSize: 18 }}>✦</span>
          <span>{eventText(events[0])}</span>
        </div>
      )}

      <div className="leaderboard-tabs" role="tablist" aria-label="أنواع الترتيب">
        <button
          className={tab === "overall" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("overall")}
        >
          الترتيب العام
        </button>
        <button
          className={tab === "game" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("game")}
        >
          نقاط اللعب
        </button>
        <button
          className={tab === "trivia" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("trivia")}
        >
          مين الأذكى 🧠
        </button>
        <button
          className={tab === "songs" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("songs")}
        >
          المغني 🎤
        </button>
        <button
          className={tab === "pictionary" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("pictionary")}
        >
          الرسّام ✎
        </button>
        <button
          className={tab === "coins" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("coins")}
        >
          الأغنى
        </button>
        <button
          className={tab === "schools" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("schools")}
        >
          أفضل مدرسة
        </button>
        <button
          className={tab === "weekly" ? "leaderboard-tab active" : "leaderboard-tab"}
          onClick={() => setTab("weekly")}
        >
          الأكثر تفاعلاً 🔥
        </button>
      </div>

      <div className="leaderboard-panel">
        {loading ? (
          <div className="empty">جاري التحميل...</div>
        ) : tab === "weekly" ? (
          weeklyPlayers.length === 0 ? (
            <div className="empty">مفيش نشاط الأسبوع ده لسه</div>
          ) : (
            <div className="list">
              {weeklyPlayers.map((p, i) => renderRankingCard(p, i, p.weeklyScore, "🔥", "نشاط أسبوعي", <span>دوس لعرض البروفايل الكامل</span>))}
            </div>
          )
        ) : tab === "trivia" ? (
          smartPlayers.length === 0 ? (
            <div className="empty">مفيش نقاط تحدي معلومات لسه — أول إجابة صح هتظهر هنا.</div>
          ) : (
            <div className="list">{smartPlayers.map((p, i) => renderRankingCard(p, i, p.trivia_points, "🧠", "نقطة ذكاء", <span>تحدي المعلومات · دوس لعرض البروفايل</span>))}</div>
          )
        ) : players.length === 0 ? (
          <div className="empty">محدش اتصدر لسه، يلا العب واحجز مكانك</div>
        ) : tab === "overall" ? (
          <div className="list">
            {sortedOverall.map((p, i) => renderPlayerRow(p, i, generalScore(p)))}
          </div>
        ) : tab === "game" ? (
          <div className="list">{sortedGame.map((p, i) => renderPlayerRow(p, i, p.points))}</div>
        ) : tab === "pictionary" ? (
          sortedPictionary.length === 0 ? (
            <div className="empty">مفيش نقاط ارسم واتقال لسه — أول تخمين صح يحجز أول مكان.</div>
          ) : (
            <div className="list">{sortedPictionary.map((p, i) => renderPlayerRow(p, i, p.pictionary_points || 0, "✎"))}</div>
          )
        ) : tab === "songs" ? (
          sortedSongs.length === 0 ? (
            <div className="empty">مفيش نقاط كمل الأغنية لسه — أول إجابة صح هتحجز أول مكان.</div>
          ) : (
            <div className="list">{sortedSongs.map((p, i) => renderPlayerRow(p, i, p.song_points || 0, "🎤"))}</div>
          )
        ) : tab === "coins" ? (
          <div className="list">
            {sortedCoins.map((p, i) => renderPlayerRow(p, i, p.coins, "🪙"))}
          </div>
        ) : (
          <div className="list">
            {schools.map((s, i) => (
              <div className={`leaderboard-school-card rank-card-${Math.min(i + 1, 4)}`} key={s.school}>
                <span className="leaderboard-rank-wrap"><span className={rankClass(i)}>{i + 1}</span><small>{i === 0 ? "القمة" : "مدرسة"}</small></span>
                <span className="leaderboard-school-copy"><span className="leaderboard-school-mark" style={{ background: getSchoolColor(s.school) }} /> <span><strong>{s.school}</strong><small>{s.count} طالب مسجل</small></span></span>
                <span className="leaderboard-card-score"><span>⭐</span><strong>{s.total}</strong><small>درجة عامة</small></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
