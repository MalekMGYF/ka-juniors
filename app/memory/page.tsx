"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";
import { vibrate, HAPTIC } from "../../lib/haptics";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedFrameColor?: string | null;
} | null;

const SYMBOLS = ["🐱", "🐶", "🐼", "🦊", "🐸", "🦁", "🐵", "🐷"];

type Card = { id: number; symbol: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  const pairs = [...SYMBOLS, ...SYMBOLS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((symbol, id) => ({ id, symbol, flipped: false, matched: false }));
}

export default function MemoryPage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [max, setMax] = useState(5);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [wonThisRound, setWonThisRound] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
  }

  async function loadStatus() {
    const res = await fetch("/api/memory/status", { cache: "no-store" });
    const data = await res.json();
    setRemaining(data.remaining ?? 0);
    setMax(data.max ?? 5);
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
    loadStatus();
  }, []);

  async function startGame() {
    setError("");
    setStarting(true);
    const res = await fetch("/api/memory/play", { method: "POST" });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      loadStatus();
      return;
    }
    setRemaining(data.remaining);
    setCards(buildDeck());
    setOpenIds([]);
    setWonThisRound(0);
    setGameOver(false);
  }

  function flip(id: number) {
    if (!cards || busy) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (openIds.length === 2) return;

    const newCards = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    setCards(newCards);
    const newOpenIds = [...openIds, id];
    setOpenIds(newOpenIds);

    if (newOpenIds.length === 2) {
      setBusy(true);
      const [firstId, secondId] = newOpenIds;
      const first = newCards.find((c) => c.id === firstId)!;
      const second = newCards.find((c) => c.id === secondId)!;

      if (first.symbol === second.symbol) {
        setTimeout(async () => {
          setCards((prev) =>
            prev
              ? prev.map((c) =>
                  c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
                )
              : prev
          );
          setOpenIds([]);
          setBusy(false);
          vibrate(HAPTIC.tap);

          const res = await fetch("/api/memory/match", { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            setWonThisRound((w) => w + 1);
            setMe((prev) => (prev ? { ...prev, coins: data.coins } : prev));
          }

          setCards((prev) => {
            if (prev && prev.every((c) => c.matched)) {
              setGameOver(true);
            }
            return prev;
          });
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev
              ? prev.map((c) =>
                  c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c
                )
              : prev
          );
          setOpenIds([]);
          setBusy(false);
        }, 800);
      }
    }
  }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      <div className="title-row memory-title-row">
        <div>
          <h2 style={{ margin: 0 }}>تحدي الذاكرة 🧠</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            قلّب اتنين، لو اتطابقوا خد كوين فورًا
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !cards ? (
        <div className="memory-intro-card">
          <span className="memory-intro-mark">🧠</span>
          <p style={{ marginTop: 0 }}>
            باقيلك <b>{remaining}</b> من {max} محاولات النهاردة
          </p>
          {error && <div className="error-text">{error}</div>}
          {remaining === 0 ? (
            <div className="muted">خلصت محاولاتك النهاردة، ارجع بكرة ⏳</div>
          ) : (
            <ShakeButton className="btn btn-gold" onClick={startGame} disabled={starting}>
              {starting ? "جاري البدء..." : "ابدأ اللعبة"}
            </ShakeButton>
          )}
        </div>
      ) : (
        <div className="memory-game-card">
          {gameOver && (
            <div className="success-text" style={{ marginBottom: 14 }}>
              🎉 خلصت اللعبة! كسبت {wonThisRound} كوين النهارده
            </div>
          )}

          <div className="memory-board">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => flip(c.id)}
                disabled={c.flipped || c.matched || busy}
                className={`memory-card ${c.flipped || c.matched ? "is-flipped" : ""} ${c.matched ? "is-matched" : ""}`}
                aria-label={c.flipped || c.matched ? `كارت ${c.symbol}` : "كارت مقفول"}
              >
                <span className="memory-card-inner"><span className="memory-card-face memory-card-front">✦</span><span className="memory-card-face memory-card-back">{c.symbol}</span></span>
              </button>
            ))}
          </div>

          {gameOver ? (
            remaining && remaining > 0 ? (
              <ShakeButton className="btn btn-gold" onClick={startGame} disabled={starting}>
                {starting ? "جاري البدء..." : `العب تاني (باقيلك ${remaining})`}
              </ShakeButton>
            ) : (
              <div className="muted">خلصت محاولاتك النهاردة، ارجع بكرة ⏳</div>
            )
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              كسبت لحد دلوقتي: {wonThisRound} كوين
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
