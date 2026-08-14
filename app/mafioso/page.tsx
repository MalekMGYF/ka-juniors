"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  daily_points?: number;
  equippedFrameColor?: string | null;
} | null;

export default function MafiosoPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, []);

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      <div className="soon-wrap">
        <div className="soon-spy">🕵️</div>
        <div className="soon-badge">قريبًا</div>
        <h2 className="soon-title">مافيوسو</h2>
        <p className="soon-desc">
          واحد فينا مافيوسو... واللعبة لسه قيد التحديث. استنى شوية، جاية.
        </p>
      </div>
    </AppShell>
  );
}
