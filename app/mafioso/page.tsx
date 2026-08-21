"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import MafiosoLobby from "../../components/MafiosoLobby";
import MafiosoRoom from "../../components/MafiosoRoom";

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
  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {});
    setRoomCode(window.localStorage.getItem("mafioso-room-code") || "");
  }, []);

  function enterRoom(code: string) { window.localStorage.setItem("mafioso-room-code", code); setRoomCode(code); }
  function leaveRoom() { window.localStorage.removeItem("mafioso-room-code"); setRoomCode(""); }

  return (
    <AppShell
      nickname={me?.nickname}
      coins={me?.coins}
      points={me?.points}
      dailyPoints={me?.daily_points}
      avatarUrl={me?.avatar_url}
      frameColor={me?.equippedFrameColor}
    >
      {roomCode ? <MafiosoRoom code={roomCode} onLeave={leaveRoom} /> : <MafiosoLobby me={me} onStarted={enterRoom} />}
    </AppShell>
  );
}
