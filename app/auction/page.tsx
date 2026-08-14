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

type Auction = {
  id: string;
  itemName: string;
  itemDescription: string;
  endTime: string;
  settled: boolean;
  winnerNickname: string | null;
  winningAmount: number | null;
} | null;

type TopBid = { amount: number; nickname: string } | null;

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(d).padStart(2, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;
}

export default function AuctionPage() {
  const [me, setMe] = useState<Me>(null);
  const [auction, setAuction] = useState<Auction>(null);
  const [topBid, setTopBid] = useState<TopBid>(null);
  const [myHighestBid, setMyHighestBid] = useState<number | null>(null);
  const [bidValue, setBidValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");

  async function load() {
    const [aRes, meRes] = await Promise.all([
      fetch("/api/auction", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" })
    ]);
    const aData = await aRes.json();
    const meData = await meRes.json();
    setAuction(aData.auction);
    setTopBid(aData.topBid);
    setMyHighestBid(aData.myHighestBid ?? null);
    setMe(meData.user);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!auction?.endTime || auction.settled) return;
    const target = new Date(auction.endTime).getTime();
    const tick = () => {
      const diff = target - Date.now();
      setCountdown(formatCountdown(diff));
      if (diff <= 0) {
        load(); // خلص الوقت، حمّل تاني عشان يظهر الفايز بعد ما يتقفل من السيرفر
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime, auction?.settled]);

  async function placeBid() {
    setError("");
    const amount = Number(bidValue);
    if (!amount || amount <= 0) {
      setError("اكتب عدد كوينات صحيح");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    vibrate(HAPTIC.tap);
    setBidValue("");
    load();
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
      <div className="title-row">
        <div>
          <h2 style={{ margin: 0 }}>المزاد الأسبوعي 🏺</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            زايد بكويناتك على الجايزة، اللي يفوز يتخصم منه بس
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : !auction ? (
        <div className="card empty">مفيش مزاد شغال دلوقتي، تابعنا هيتضاف قريب</div>
      ) : (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{auction.itemName}</h3>
          {auction.itemDescription && <p className="muted">{auction.itemDescription}</p>}

          {!auction.settled && countdown && (
            <div style={{ marginBottom: 16 }}>
              <span className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                باقي على قفل المزاد
              </span>
              <span className="countdown-box">⏳ {countdown}</span>
            </div>
          )}

          {auction.settled ? (
            <div className="success-text">
              🏆 المزاد اتقفل! الفايز: {auction.winnerNickname || "محدش زايد"}
              {auction.winnerNickname && ` بـ ${auction.winningAmount} كوين`}
            </div>
          ) : (
            <>
              <div className="badge badge-coin" style={{ marginBottom: 16, display: "inline-flex" }}>
                🪙 أعلى مزايدة حاليًا: {topBid ? `${topBid.amount} (${topBid.nickname})` : "لسه محدش زايد"}
              </div>

              {myHighestBid && (
                <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  أعلى مزايدة بعتها إنت: {myHighestBid} كوين
                </div>
              )}

              {error && <div className="error-text">{error}</div>}

              <div className="field">
                <label>هتزايد بكام كوين؟</label>
                <input
                  className="input"
                  type="number"
                  min={(topBid?.amount || 0) + 1}
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  placeholder={`أكتر من ${topBid?.amount || 0}`}
                />
              </div>

              <ShakeButton className="btn btn-gold" onClick={placeBid} disabled={busy}>
                {busy ? "جاري الإرسال..." : "زايد دلوقتي"}
              </ShakeButton>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
