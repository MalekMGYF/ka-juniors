// Style reminder: ranking is a focused midnight scoreboard; each category is a clear, tappable lane with gold reserved for achievement and mint for live intelligence.
"use client";

import { useEffect, useState } from "react";
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

type Tab = "overall" | "game" | "trivia" | "pictionary" | "coins" | "schools" | "weekly";

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

  function renderPlayerRow(p: Player, i: number, showValue: number, icon: string = "⭐") {
    const level = getLevel(tab === "overall" ? generalScore(p) : p.points + p.daily_points);
    const schoolColor = getSchoolColor(p.school);
    return (
      <div
        key={p.nickname}
        className="row"
        style={{
          cursor: "pointer",
          borderColor: p.nickname === me?.nickname ? "var(--gold)" : undefined
        }}
        onClick={() => goToProfile(p.nickname)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={rankClass(i)}>{i + 1}</span>
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={p.nickname}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                objectFit: "cover",
                border: p.equippedFrameColor ? `2px solid ${p.equippedFrameColor}` : undefined
              }}
            />
          ) : (
            <div
              className="avatar"
              style={{
                width: 34,
                height: 34,
                fontSize: 14,
                border: p.equippedFrameColor ? `2px solid ${p.equippedFrameColor}` : undefined
              }}
            >
              {p.nickname.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700 }}>
              {p.nickname}{" "}
              <span style={{ fontSize: 10, color: level.color, fontWeight: 700 }}>
                {level.icon} {level.name}
              </span>
              {p.equippedTitle && (
                <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700 }}>
                  {" "}
                  ✦ {p.equippedTitle}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span className="school-dot" style={{ background: schoolColor }} />
              <span className="muted" style={{ fontSize: 11 }}>{p.school}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <span className={icon === "🪙" ? "badge badge-coin" : "badge badge-point"}>
            {icon} {showValue}
          </span>
          {tab === "overall" && (
            <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
              {p.points} ألعاب + {p.daily_points} يومي + {p.trivia_points || 0} معلومات + {p.activity_points || 0} تفاعل
            </div>
          )}
        </div>
      </div>
    );
  }

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

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={tab === "overall" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("overall")}
        >
          الترتيب العام
        </button>
        <button
          className={tab === "game" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("game")}
        >
          نقاط اللعب
        </button>
        <button
          className={tab === "trivia" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("trivia")}
        >
          مين الأذكى 🧠
        </button>
        <button
          className={tab === "pictionary" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("pictionary")}
        >
          الرسّام ✎
        </button>
        <button
          className={tab === "coins" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("coins")}
        >
          الأغنى
        </button>
        <button
          className={tab === "schools" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("schools")}
        >
          أفضل مدرسة
        </button>
        <button
          className={tab === "weekly" ? "nav-link active" : "nav-link"}
          style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)", flex: 1 }}
          onClick={() => setTab("weekly")}
        >
          الأكثر تفاعلاً 🔥
        </button>
      </div>

      <div className="card card-tight">
        {loading ? (
          <div className="empty">جاري التحميل...</div>
        ) : tab === "weekly" ? (
          weeklyPlayers.length === 0 ? (
            <div className="empty">مفيش نشاط الأسبوع ده لسه</div>
          ) : (
            <div className="list">
              {weeklyPlayers.map((p, i) => (
                <div
                  className="row"
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => goToProfile(p.nickname)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={rankClass(i)}>{i + 1}</span>
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.nickname}
                        style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>
                        {p.nickname.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.nickname}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{p.school}</div>
                    </div>
                  </div>
                  <span className="badge badge-point">🔥 {p.weeklyScore}</span>
                </div>
              ))}
            </div>
          )
        ) : tab === "trivia" ? (
          smartPlayers.length === 0 ? (
            <div className="empty">مفيش نقاط تحدي معلومات لسه — أول إجابة صح هتظهر هنا.</div>
          ) : (
            <div className="list">{smartPlayers.map((p, i) => <div className="row" key={p.id} style={{ cursor: "pointer", borderColor: p.nickname === me?.nickname ? "var(--gold)" : undefined }} onClick={() => goToProfile(p.nickname)}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className={rankClass(i)}>{i + 1}</span>{p.avatar_url ? <img src={p.avatar_url} alt={p.nickname} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: p.equippedFrameColor ? `2px solid ${p.equippedFrameColor}` : undefined }} /> : <div className="avatar" style={{ width: 34, height: 34, fontSize: 14, border: p.equippedFrameColor ? `2px solid ${p.equippedFrameColor}` : undefined }}>{p.nickname.charAt(0)}</div>}<div><div style={{ fontWeight: 700 }}>{p.nickname}</div><div className="muted" style={{ fontSize: 11 }}>تحدي المعلومات</div></div></div><span className="badge badge-point">🧠 {p.trivia_points}</span></div>)}</div>
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
        ) : tab === "coins" ? (
          <div className="list">
            {sortedCoins.map((p, i) => renderPlayerRow(p, i, p.coins, "🪙"))}
          </div>
        ) : (
          <div className="list">
            {schools.map((s, i) => (
              <div className="row" key={s.school}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={rankClass(i)}>{i + 1}</span>
                  <span className="school-dot" style={{ background: getSchoolColor(s.school) }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.school}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{s.count} طالب مسجل</div>
                  </div>
                </div>
                <span className="badge badge-point">⭐ {s.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
