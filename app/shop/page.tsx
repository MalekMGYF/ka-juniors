"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import ShakeButton from "../../components/ShakeButton";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedTitle?: string | null;
  equippedFrameColor?: string | null;
} | null;

type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: "title" | "frame_color";
  value: string;
  owned: boolean;
  active: boolean;
};

export default function ShopPage() {
  const [me, setMe] = useState<Me>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [meRes, shopRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/shop", { cache: "no-store" })
    ]);
    const meData = await meRes.json();
    const shopData = await shopRes.json();
    setMe(meData.user);
    setItems(shopData.items || []);
    setCoins(shopData.coins || 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(item: ShopItem) {
    setError("");
    setBusy(item.id);
    const res = await fetch("/api/shop/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id })
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    load();
  }

  async function toggleEquip(item: ShopItem) {
    setBusy(item.id);
    await fetch("/api/shop/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, activate: !item.active })
    });
    setBusy(null);
    load();
  }

  const titles = items.filter((i) => i.type === "title");
  const frames = items.filter((i) => i.type === "frame_color");

  function renderItem(item: ShopItem) {
    return (
      <div className="card card-tight" key={item.id}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {item.type === "frame_color" && (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `3px solid ${item.value}`,
                    display: "inline-block"
                  }}
                />
              )}
              {item.name}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{item.description}</div>
          </div>
          {item.owned ? (
            <button
              className={item.active ? "btn btn-gold" : "btn btn-outline"}
              style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
              onClick={() => toggleEquip(item)}
              disabled={busy === item.id}
            >
              {item.active ? "مفعّل ✓" : "فعّله"}
            </button>
          ) : (
            <button
              className="btn btn-gold"
              style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
              onClick={() => buy(item)}
              disabled={busy === item.id || coins < item.cost}
            >
              🪙 {item.cost}
            </button>
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
          <h2 style={{ margin: 0 }}>المتجر</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            استبدل كوناتك بألقاب وإطارات مميزة
          </p>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      {loading ? (
        <div className="card empty">جاري التحميل...</div>
      ) : (
        <>
          <h3>الألقاب</h3>
          <div className="list" style={{ marginBottom: 22 }}>
            {titles.map(renderItem)}
          </div>

          <h3>الإطارات</h3>
          <div className="list">{frames.map(renderItem)}</div>
        </>
      )}
    </AppShell>
  );
}
