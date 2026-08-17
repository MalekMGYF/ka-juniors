"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/AppShell";

type Me = {
  nickname: string;
  points: number;
  coins: number;
  avatar_url?: string | null;
  dailyPoints?: number;
  daily_points?: number;
  equippedFrameColor?: string | null;
} | null;

type ChatMessage = {
  id: string;
  message: string;
  createdAt: string;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [me, setMe] = useState<Me>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    setMe(data.user);
  }

  async function loadMessages() {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      console.error("chat load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (firstLoad.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      firstLoad.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  async function send() {
    if (!text.trim() || sending) return;
    setError("");
    setSending(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    setText("");
    loadMessages();
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
          <h2 style={{ margin: 0 }}>الشات العام 💬</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            اتكلم مع زمايلك، ومن غير شتايم لو سمحت
          </p>
        </div>
      </div>

      <div className="chat-window">
        {loading ? (
          <div className="empty">جاري التحميل...</div>
        ) : messages.length === 0 ? (
          <div className="empty">لسه محدش كتب حاجة، ابدأ إنت</div>
        ) : (
          <>
            {messages.map((m) => {
              const isMine = m.nickname === me?.nickname;
              return (
                <div
                  key={m.id}
                  className={`chat-bubble-row ${isMine ? "mine" : ""}`}
                >
                  {!isMine && (
                    <div className="avatar chat-avatar">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.nickname}
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        m.nickname.charAt(0)
                      )}
                    </div>
                  )}
                  <div className={`chat-bubble ${isMine ? "mine" : ""}`}>
                    {!isMine && <div className="chat-bubble-name">{m.nickname}</div>}
                    <div>{m.message}</div>
                    <div className="chat-bubble-time">{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="chat-input-row">
        <input
          className="input"
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={300}
        />
        <button className="btn btn-gold chat-send-btn" onClick={send} disabled={sending}>
          إرسال
        </button>
      </div>
    </AppShell>
  );
}
