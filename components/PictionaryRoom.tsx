// Style reminder: this room is the night sketch studio—charcoal surfaces, gold wins, mint live states, and a drawing stage that stays visually dominant.

"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CanvasBoard from "./CanvasBoard";
import { ChatMessage, normalizeGuess, Player, PictionaryPhase, Stroke, timeLabel } from "../lib/pictionary";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { pictionaryChannelName } from "../lib/pictionary-channel";

type Me = { nickname?: string; points?: number; coins?: number; avatar_url?: string | null; daily_points?: number } | null;
type Props = { me: Me; roomCode: string; isHost?: boolean; onExit: () => void };
const colors = ["#f5b942", "#7ce0c0", "#ff6b6b", "#f3f1ea", "#b9a7ff", "#62b5ff", "#ff8e6e", "#ffffff"];

function Avatar({ player, small = false }: { player: Player; small?: boolean }) {
  return <span className={`pictionary-avatar ${small ? "pictionary-avatar-small" : ""}`} style={{ borderColor: player.color }}>{player.initials}<i>{player.isDrawer ? "✦" : ""}</i></span>;
}

function ChatItem({ item }: { item: ChatMessage }) {
  if (item.kind === "system") return <div className="pictionary-system-message"><span>✦</span>{item.text}</div>;
  return <div className={`pictionary-chat-item pictionary-chat-${item.kind}`}><div className="pictionary-message-meta"><b>{item.author}</b><small>{item.time}</small></div><div className="pictionary-message-bubble">{item.text}</div></div>;
}

export default function PictionaryRoom({ me, roomCode, isHost = false, onExit }: Props) {
  const [isDrawer, setIsDrawer] = useState(false);
  const [phase, setPhase] = useState<PictionaryPhase>("drawing");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(43);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guess, setGuess] = useState("");
  const [inkColor, setInkColor] = useState(colors[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [clearSignal, setClearSignal] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"offline" | "connecting" | "live" | "reconnecting">("offline");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [roundReady, setRoundReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const nextRoundTimerRef = useRef<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<{ name: string; points: number; coins: number } | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);
  const [gameFinished, setGameFinished] = useState(false);
  const [activeDrawerId, setActiveDrawerId] = useState<string | null>(null);
  const [activeDrawerName, setActiveDrawerName] = useState("الرسام");
  const word = selectedWord ?? "—";
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.points - a.points), [players]);
  const drawerPlayer = players.find((player) => player.id === activeDrawerId) || players.find((player) => player.isDrawer) || { id: "pending-drawer", name: activeDrawerName, initials: activeDrawerName.trim().charAt(0) || "؟", color: "#7ce0c0", points: 0, coins: 0, isDrawer: true };

  const postGame = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/pictionary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.configured !== false) setSyncReady(true);
      return data;
    } catch { return null; }
  };

  useEffect(() => {
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setSyncStatus("offline");
      postGame({ action: "join_room", code: roomCode });
      return () => { cancelled = true; };
    }

    const applySnapshot = (data: {
      configured?: boolean;
      sessionUserId?: string;
      isDrawer?: boolean;
      room?: { status?: string; current_word?: string | null; current_drawer_id?: string | null; round_ends_at?: string | null; word_options?: unknown; round_number?: number; max_rounds?: number } | null;
      messages?: Array<{ id: number; body: string; is_correct: boolean; created_at: string; users?: { nickname?: string } | null }>;
      players?: Array<{ user_id: string; score: number; round_coins: number; isYou?: boolean; isDrawer?: boolean; users?: { nickname?: string } | null }>;
      strokes?: Stroke[];
    }) => {
      if (cancelled || !data.configured || !data.room) return;
      setSyncReady(true);
      if (data.sessionUserId) { sessionUserIdRef.current = data.sessionUserId; setSessionUserId(data.sessionUserId); }
      if (typeof data.isDrawer === "boolean") setIsDrawer(data.isDrawer);
      if (typeof data.room.round_number === "number") setRoundNumber(data.room.round_number);
      if (typeof data.room.max_rounds === "number") setMaxRounds(data.room.max_rounds);
      if (typeof data.room.current_word === "string" && data.isDrawer) setSelectedWord(data.room.current_word);
      if (data.isDrawer && Array.isArray(data.room.word_options)) setWordOptions(data.room.word_options.filter((word): word is string => typeof word === "string"));
      if (data.room.status === "drawing") { setPhase(data.isDrawer && !data.room.current_word ? "choose" : "drawing"); setRoundReady(Boolean(data.room.round_ends_at)); setSeconds(data.room.round_ends_at ? Math.max(0, Math.round((new Date(data.room.round_ends_at).getTime() - Date.now()) / 1000)) : 120); }
      if (data.room.status === "round_end") setPhase("roundEnd");
      if (data.room.status === "finished") { setPhase("roundEnd"); setGameFinished(true); setRoundReady(false); }
      if (Array.isArray(data.messages)) setMessages(data.messages.map((item) => ({ id: item.id, author: item.users?.nickname || "لاعب", text: item.body, kind: item.is_correct ? "success" : "guess", time: new Date(item.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) })));
      if (Array.isArray(data.players)) {
        const snapshotPlayers = data.players.map((item) => { const name = item.users?.nickname || "لاعب"; return { id: item.user_id, name, initials: name.trim().charAt(0) || "ل", color: item.isYou ? "#f5b942" : item.isDrawer ? "#7ce0c0" : "#b9a7ff", points: item.score || 0, coins: item.round_coins || 0, isYou: item.isYou, isDrawer: item.isDrawer }; });
        setPlayers(snapshotPlayers);
        const currentDrawer = snapshotPlayers.find((player) => player.isDrawer);
        if (currentDrawer) { setActiveDrawerId(currentDrawer.id); setActiveDrawerName(currentDrawer.name); }
      }
      if (Array.isArray(data.strokes)) setStrokes(data.strokes.map((stroke) => ({ id: stroke.id, points: stroke.points, color: stroke.color, brushSize: stroke.brushSize, tool: stroke.tool })));
    };

    const readSnapshot = async () => {
      try {
        const response = await fetch(`/api/pictionary?code=${encodeURIComponent(roomCode)}`, { cache: "no-store" });
        const data = await response.json();
        applySnapshot(data);
      } catch {
        if (!cancelled) setSyncStatus("reconnecting");
      }
    };

    const applyEvent = (event: string, payload: Record<string, unknown>) => {
      const applyCurrentDrawer = (drawerId: string, drawerName?: string) => {
        if (!drawerId) return;
        setActiveDrawerId(drawerId);
        if (drawerName) setActiveDrawerName(drawerName);
        setIsDrawer(drawerId === sessionUserIdRef.current);
        setPlayers((items) => items.map((player) => {
          const isCurrentDrawer = player.id === drawerId;
          return { ...player, isDrawer: isCurrentDrawer, color: player.isYou ? "#f5b942" : isCurrentDrawer ? "#7ce0c0" : "#b9a7ff" };
        }));
      };
      if (event === "message_created" && typeof payload.id === "number") {
        const isOwnCorrectAnswer = payload.hidden === true && payload.userId === sessionUserIdRef.current;
        const isHiddenCorrectAnswer = payload.hidden === true && !isOwnCorrectAnswer;
        setMessages((items) => items.some((item) => item.id === payload.id) ? items : [...items, { id: payload.id as number, author: isHiddenCorrectAnswer ? "النظام" : String(payload.author || "لاعب"), text: isOwnCorrectAnswer ? "✓ إجابتك صح!" : isHiddenCorrectAnswer ? `${String(payload.author || "لاعب")} لقطها صح!` : String(payload.body || ""), kind: isHiddenCorrectAnswer ? "system" : payload.isCorrect ? "success" : "guess", time: "دلوقتي" }]);
      }
      if (event === "stroke_created" && typeof payload.id === "number" && Array.isArray(payload.points)) {
        setStrokes((items) => items.some((stroke) => stroke.id === payload.id) ? items : [...items, { id: payload.id as number, points: payload.points as Array<{ x: number; y: number }>, color: String(payload.color || "#f5b942"), brushSize: Number(payload.brushSize) || 8, tool: payload.tool === "eraser" ? "eraser" : "brush" }]);
      }
      if (event === "round_started") {
        applyCurrentDrawer(String(payload.drawerId || ""), typeof payload.drawerName === "string" ? payload.drawerName : undefined);
        setPhase("drawing"); setRoundReady(true); setSeconds(Math.max(0, Math.round((new Date(String(payload.endsAt)).getTime() - Date.now()) / 1000))); setHasGuessed(false); setRoundWinner(null); setStrokes([]); setClearSignal((value) => value + 1);
      }
      if (event === "game_started") {
        const drawer = payload.drawerId === sessionUserIdRef.current;
        const incomingOptions = Array.isArray(payload.wordOptions) ? payload.wordOptions.filter((word): word is string => typeof word === "string") : [];
        applyCurrentDrawer(String(payload.drawerId || ""), typeof payload.drawerName === "string" ? payload.drawerName : undefined);
        setIsDrawer(drawer); setPhase(drawer ? "choose" : "drawing"); setRoundReady(false); setSelectedWord(null); setWordOptions(incomingOptions); setSeconds(120); setHasGuessed(false); setRoundWinner(null); setGameFinished(false); setRoundNumber(Number(payload.roundNumber) || 1); setMaxRounds(Number(payload.maxRounds) || 5); setStrokes([]); setClearSignal((value) => value + 1);
      }
      if (event === "round_winner") {
        const winnerId = String(payload.winnerId || "");
        const winnerPoints = Number(payload.points) || 0;
        const winnerCoins = Number(payload.coins) || 0;
        setRoundWinner({ name: String(payload.winnerName || "لاعب"), points: winnerPoints, coins: winnerCoins });
        setPlayers((items) => items.map((player) => player.id === winnerId ? { ...player, state: "guessed", points: player.points + winnerPoints, coins: player.coins + winnerCoins } : player));
        setMessages((items) => items.some((item) => item.kind === "system" && item.text.includes(String(payload.winnerName || "لاعب")) && item.text.includes("لقطها")) ? items : [...items, { id: Date.now(), author: "النظام", text: `${String(payload.winnerName || "لاعب")} لقطها قبل الكل! +${Number(payload.points) || 0} نقطة`, kind: "system", time: "دلوقتي" }]);
      }
      if (event === "round_ended") {
        setPhase("roundEnd"); setRoundReady(false); setSelectedWord(typeof payload.word === "string" ? payload.word : null); setSeconds(0);
        setMessages((items) => [...items, { id: Date.now(), author: "النظام", text: payload.timedOut ? "الوقت خلص! الجولة انتهت." : payload.allAnswered ? "كل اللاعبين جاوبوا صح! الجولة خلصت." : `${String(payload.winnerName || "لاعب")} لقطها قبل الكل!`, kind: "system", time: "دلوقتي" }]);
        if (payload.allAnswered && isHost) {
          if (nextRoundTimerRef.current) window.clearTimeout(nextRoundTimerRef.current);
          nextRoundTimerRef.current = window.setTimeout(() => { void postGame({ action: "next_round", code: roomCode }); }, 2200);
        }
      }
      if (event === "game_finished") {
        setPhase("roundEnd"); setRoundReady(false); setGameFinished(true); setRoundNumber(Number(payload.roundNumber) || roundNumber); setMaxRounds(Number(payload.maxRounds) || maxRounds);
        setMessages((items) => [...items, { id: Date.now(), author: "النظام", text: "انتهت كل جولات الروم! شوفوا النتيجة النهائية.", kind: "system", time: "دلوقتي" }]);
      }
      if (event === "player_joined") void readSnapshot();
      if (event === "player_left") void readSnapshot();
    };

    const channel = client.channel(pictionaryChannelName(roomCode), { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "message_created" }, ({ payload }) => applyEvent("message_created", payload));
    channel.on("broadcast", { event: "stroke_created" }, ({ payload }) => applyEvent("stroke_created", payload));
    channel.on("broadcast", { event: "game_started" }, ({ payload }) => applyEvent("game_started", payload));
    channel.on("broadcast", { event: "round_started" }, ({ payload }) => applyEvent("round_started", payload));
    channel.on("broadcast", { event: "round_ended" }, ({ payload }) => applyEvent("round_ended", payload));
    channel.on("broadcast", { event: "game_finished" }, ({ payload }) => applyEvent("game_finished", payload));
    channel.on("broadcast", { event: "player_joined" }, ({ payload }) => applyEvent("player_joined", payload));
    channel.on("broadcast", { event: "player_left" }, ({ payload }) => applyEvent("player_left", payload));
    setSyncStatus("connecting");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") { setSyncStatus("live"); void readSnapshot(); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { setSyncStatus("reconnecting"); void readSnapshot(); }
      if (status === "CLOSED") setSyncStatus("offline");
    });
    void postGame({ action: "join_room", code: roomCode });

    return () => { cancelled = true; if (nextRoundTimerRef.current) window.clearTimeout(nextRoundTimerRef.current); void client.removeChannel(channel); };
  }, [roomCode]);

  useEffect(() => {
    if (phase !== "drawing" || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, seconds]);

  useEffect(() => {
    if (seconds !== 0 || phase !== "drawing") return;
    setPhase("roundEnd");
    setMessages((items) => [...items, { id: Date.now(), author: "النظام", text: "الوقت خلص! الجولة انتهت.", kind: "system", time: "دلوقتي" }]);
    void postGame({ action: "expire_round", code: roomCode });
  }, [seconds, phase, word]);

  useEffect(() => {
    if (!gameFinished) return;
    const timer = window.setTimeout(onExit, 2800);
    return () => window.clearTimeout(timer);
  }, [gameFinished, onExit]);

  const addSystem = (text: string) => setMessages((items) => [...items, { id: Date.now(), author: "النظام", text, kind: "system", time: "الآن" }]);

  const chooseWord = (nextWord: string) => {
    setSelectedWord(nextWord); setPhase("drawing"); setSeconds(120); setHasGuessed(false); setStrokes([]); setClearSignal((value) => value + 1); postGame({ action: "choose_word", code: roomCode, word: nextWord }); addSystem("الكلمة اتقفلت… ورّيهم شطارتك في الرسم.");
  };

  const sendGuess = async (event: FormEvent) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value || phase !== "drawing") return;
    if (isDrawer || hasGuessed || !roundReady) return;
    const data = await postGame({ action: "message", code: roomCode, message: value });
    const correct = Boolean(data?.correct);
    const messageId = Number(data?.messageId);
    setMessages((items) => Number.isFinite(messageId) && items.some((item) => item.id === messageId) ? items : [...items, { id: Number.isFinite(messageId) ? messageId : Date.now(), author: me?.nickname || "أنت", text: value, kind: correct ? "success" : "you", time: "دلوقتي" }]);
    setGuess("");
    if (!correct) return;
    setHasGuessed(true);
    setRoundWinner(data.isRoundWinner ? { name: me?.nickname || "أنت", points: data.points || 3, coins: data.coins || 2 } : roundWinner);
    setPlayers((items) => items.map((player) => player.isYou ? { ...player, state: "guessed", points: player.points + Number(data.points || 0), coins: player.coins + Number(data.coins || 0) } : player));
    if (data.isRoundWinner) addSystem(`أنت لقطتها الأول! +${data.points || 3} نقاط و +${data.coins || 2} كوين.`);
    else addSystem(`إجابتك صح! +${data.points || 3} نقاط و +${data.coins || 2} كوين.`);
  };

  const newRound = async () => { if (!isHost) { addSystem("مستنيين صاحب الروم يبدأ الجولة الجديدة."); return; } const data = await postGame({ action: "next_round", code: roomCode }); if (data?.finished) { setGameFinished(true); setPhase("roundEnd"); setRoundNumber(Number(data.roundNumber) || roundNumber); setMaxRounds(Number(data.maxRounds) || maxRounds); } };

  return (
    <section className="pictionary-room">
      <header className="pictionary-heading">
        <div><div className="pictionary-eyebrow"><span /> غرفة الأصحاب <span /></div><h1>ارسمها… قبل ما تتقال</h1><p>واحد يرسم، والباقي يجروا على الشات. أول تخمين صح ياخد اللمعة الأكبر.</p></div>
        <div className="pictionary-heading-actions"><span className="pictionary-room-code-tag">ROOM · {roomCode}</span><button className="pictionary-help" aria-label="مساعدة">?</button></div>
      </header>

      <div className="pictionary-round-strip"><div className="pictionary-round-main"><div className="pictionary-round-number"><b>{String(roundNumber).padStart(2, "0")}</b><small>/ {String(maxRounds).padStart(2, "0")}</small></div><div><strong>{gameFinished ? "انتهت اللعبة" : phase === "choose" ? "اختيار الكلمة" : phase === "roundEnd" ? "نهاية الجولة" : `الجولة ${String(roundNumber).padStart(2, "0")}`}</strong><span>كل تخمين أسرع = نقاط أكتر</span></div></div><div className="pictionary-round-live"><i /> {gameFinished ? "النتيجة النهائية جاهزة" : isDrawer ? phase === "choose" ? "اختار كلمة سرية" : "أنت الرسّام دلوقتي" : phase === "roundEnd" ? "الجولة خلصت" : `${drawerPlayer.name} بيرسم دلوقتي`}</div><div className="pictionary-streak">♨ جولات الروم <b>{maxRounds}</b></div></div>

      {roundWinner && phase === "drawing" && <div className="pictionary-winner-flash"><strong>♛ {roundWinner.name} لقطها قبل الكل!</strong><span>+{roundWinner.points} نقطة · +{roundWinner.coins} كوين — الجولة لسه شغالة</span></div>}

      <div className="pictionary-layout">
        <section className="pictionary-board-column">
          <div className="pictionary-board-card">
            <div className="pictionary-board-top"><div className="pictionary-drawer"><Avatar player={drawerPlayer} /><div><small>{isDrawer ? "دورك في الرسم" : "الرسّام الحالي"}</small><b>{isDrawer ? "أنت" : drawerPlayer.name}</b></div><em>✎ بيرسم</em></div><div className={`pictionary-timer ${seconds <= 10 ? "danger" : ""}`}><b>◷ {timeLabel(seconds)}</b><small>الوقت المتبقي</small></div></div>
            <div className="pictionary-word-bar"><span>◉ {isDrawer ? "الكلمة السرية" : "خمن الكلمة"}</span><b>{isDrawer && phase === "drawing" ? word : "● ● ● ●"}</b><small>{isDrawer ? "خلي الرسم يتكلم" : roundReady ? "ممنوع تسأل الرسّام" : "استنى الرسام يختار الكلمة"}</small></div>
            <div className={`pictionary-canvas-wrap ${isDrawer && phase === "choose" ? "pictionary-canvas-choosing" : ""}`}><CanvasBoard canDraw={isDrawer && phase === "drawing"} color={inkColor} brushSize={brushSize} tool={tool} clearSignal={clearSignal} strokes={strokes} onStroke={(points) => { setStrokes((items) => [...items, { points, color: inkColor, brushSize, tool }]); postGame({ action: "stroke", code: roomCode, points, color: inkColor, brushSize, tool }); }} />
              {isDrawer && phase === "choose" && <div className="pictionary-overlay"><div className="pictionary-picker"><small>الجولة بدأت</small><h2>اختار كلمة… وخلّيهم يحتاروا</h2><p>دي الكلمات الثلاث اللي اتسحبت عشوائيًا من بنك الأدمن.</p><div className="pictionary-word-choices">{wordOptions.map((option, index) => <button key={option} onClick={() => chooseWord(option)}><i>0{index + 1}</i><strong>✦</strong><span><b>{option}</b><small>من بنك كلمات الروم</small></span><em>‹</em></button>)}{wordOptions.length === 0 && <p>مفيش كلمات جاهزة. ارجع للأدمن وأضف 3 كلمات على الأقل.</p>}</div></div></div>}
              {phase === "roundEnd" && <div className="pictionary-overlay"><div className="pictionary-result"><strong>♛</strong><small>{gameFinished ? "النتيجة النهائية" : "لقطة الجولة"}</small><h2>{gameFinished ? "خلصت كل الجولات!" : hasGuessed ? "لقطتها قبل الكل" : "جولة حلوة"}</h2><p>{gameFinished ? `اللعبة انتهت بعد ${maxRounds} جولات — هترجع لقائمة الرومات خلال لحظات.` : <>الكلمة كانت <b>{word}</b> — جاهز للجولة اللي بعدها؟</>}</p>{!gameFinished && <button onClick={newRound}>↻ {roundNumber >= maxRounds ? "إنهاء اللعبة" : "جولة جديدة"}</button>}</div></div>}
            </div>
            <div className="pictionary-toolbar"><div className="pictionary-tools"><small>الأداة</small><span><button className={tool === "brush" ? "active" : ""} onClick={() => setTool("brush")} disabled={!isDrawer}>✎ فرشاة</button><button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")} disabled={!isDrawer}>⌫ ممحاة</button></span></div><div><small>لون الحبر</small><span className="pictionary-colors">{colors.map((color) => <button key={color} className={inkColor === color ? "active" : ""} style={{ background: color }} onClick={() => { setInkColor(color); setTool("brush"); }} aria-label="اختيار لون" />)}</span></div><div><small>حجم الفرشاة</small><span className="pictionary-brushes">{[4, 8, 16, 24].map((size) => <button key={size} className={brushSize === size ? "active" : ""} onClick={() => setBrushSize(size)}><i style={{ width: size / 2 + 3, height: size / 2 + 3 }} /></button>)}</span></div><button className="pictionary-clear" disabled={!isDrawer || phase !== "drawing"} onClick={() => { setStrokes([]); setClearSignal((value) => value + 1); }}>⌫ امسح اللوحة</button></div>
          </div>
            <div className="pictionary-footnote">✦ {syncStatus === "live" ? "Realtime شغال — التحديثات بتوصل فورًا" : syncStatus === "reconnecting" || syncStatus === "connecting" ? "جاري الاتصال بالغرفة…" : syncReady ? "Supabase شغال — أضف المفتاح العام لتفعيل Realtime" : "وضع تجربة سريع — أضف إعدادات Supabase لتشغيل الغرفة الجماعية"} <span>•</span> ما فيش إجابة بتظهر غير بعد التخمين الصح</div>
        </section>

        <aside className="pictionary-side">
          <div className="pictionary-chat-card"><div className="pictionary-card-head"><div><h3>◌ الشات</h3><small>قول أول حاجة جت في بالك</small></div><b>♧ {players.length} لاعبين</b></div><div className="pictionary-chat-feed">{messages.map((item) => <ChatItem item={item} key={item.id} />)}</div><form className="pictionary-guess-form" onSubmit={sendGuess}><input value={guess} disabled={isDrawer || phase !== "drawing" || hasGuessed || !roundReady} onChange={(event) => setGuess(event.target.value)} placeholder={isDrawer ? "إنت الرسّام… ارسم بس" : !roundReady ? "استنى اختيار الكلمة…" : hasGuessed ? "إجابتك اتسجلت" : "اكتب تخمينك هنا…"} /><button disabled={isDrawer || phase !== "drawing" || hasGuessed || !roundReady || !guess.trim()} aria-label="إرسال التخمين">➤</button></form><div className="pictionary-chat-tip">ϟ التخمين الصح يكسب <b>3 نقاط</b> و <b>2 كوين</b></div></div>
          <div className="pictionary-players-card"><div className="pictionary-card-head"><div><small>اللاعبين</small><h3>مين سابق؟</h3></div><b className="pictionary-online">● {players.length} متصلين</b></div><div className="pictionary-player-list">{sortedPlayers.map((player, index) => <div className={`pictionary-player ${player.isYou ? "you" : ""}`} key={player.id}><span>{index === 0 ? "♛" : String(index + 1).padStart(2, "0")}</span><Avatar player={player} small /><div><b>{player.name} {player.isYou && <small>(أنت)</small>}</b><em>{player.isDrawer ? "بيرسم الآن" : player.state === "guessed" ? "لقطها" : "بيفكر…"}</em></div><strong>{player.points}<small>🪙 {player.coins}</small></strong></div>)}</div><button className="pictionary-all-players">كل تفاصيل الغرفة ‹</button></div>
        </aside>
      </div>

      <div className="pictionary-how"><div className="pictionary-how-intro"><strong>◉</strong><span>اللعبة في 3 خطوات<b>ارسم. خمّن. اكسب.</b></span></div><div><i>01</i><span><b>اختار كلمة</b><small>الرسّام يختار من 3</small></span></div><div><i>02</i><span><b>ارسم من غير كلام</b><small>خلي الخطوط تشرح</small></span></div><div><i>03</i><span><b>اكسب اللمعة</b><small>الأسرع ياخد أكتر</small></span></div><div className="pictionary-pencil">✎</div></div>
      <button className="pictionary-exit-button" onClick={() => setConfirmExit(true)}>خروج من الروم</button>
      {confirmExit && <div className="pictionary-exit-overlay" role="dialog" aria-modal="true"><div className="pictionary-exit-modal"><strong>تأكد من الخروج؟</strong><p>هتسيب الروم الحالية وممكن الدور يكمل من غيرك.</p><div><button className="pictionary-exit-no" onClick={() => setConfirmExit(false)}>لا، خليك</button><button className="pictionary-exit-yes" onClick={async () => { await postGame({ action: "leave_room", code: roomCode }); onExit(); }}>أيوه، اخرج</button></div></div></div>}
    </section>
  );
}
