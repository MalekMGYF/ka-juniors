// Style reminder: this protected page places the game inside the existing AppShell and preserves the K.A Juniors navigation, stats, and RTL rhythm.

"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import PictionaryLobby from "../../components/PictionaryLobby";
import PictionaryRoom from "../../components/PictionaryRoom";

type Me = { nickname: string; points: number; coins: number; avatar_url?: string | null; daily_points?: number; equippedFrameColor?: string | null } | null;

export default function PictionaryPage() {
  const [me, setMe] = useState<Me>(null);
  const [activeRoom, setActiveRoom] = useState<{ code: string; isHost: boolean } | null>(null);
  useEffect(() => { fetch("/api/me", { cache: "no-store" }).then((response) => response.json()).then((data) => setMe(data.user)).catch(() => {}); }, []);
  return <AppShell nickname={me?.nickname} coins={me?.coins} points={me?.points} dailyPoints={me?.daily_points} avatarUrl={me?.avatar_url} frameColor={me?.equippedFrameColor}>{activeRoom ? <PictionaryRoom me={me} roomCode={activeRoom.code} isHost={activeRoom.isHost} onExit={() => setActiveRoom(null)} /> : <PictionaryLobby me={me} onStarted={setActiveRoom} />}</AppShell>;
}
