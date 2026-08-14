// Style reminder: keep the drawing-room vocabulary playful, concise, and aligned with the charcoal/gold/mint K.A Juniors identity.

export type PictionaryPhase = "choose" | "drawing" | "roundEnd";

export type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  points: number;
  coins: number;
  isDrawer?: boolean;
  isYou?: boolean;
  state?: "ready" | "thinking" | "guessed";
};

export type ChatMessage = {
  id: number;
  author: string;
  text: string;
  kind: "system" | "guess" | "success" | "you";
  time: string;
};

export type Stroke = {
  id?: number;
  points: Array<{ x: number; y: number }>;
  color: string;
  brushSize: number;
  tool?: "brush" | "eraser";
};

export const wordChoices = [
  { word: "مظلة", hint: "بتحميك من المطر", icon: "☂" },
  { word: "صاروخ", hint: "بيطلع لفوق بسرعة", icon: "🚀" },
  { word: "بيتزا", hint: "دائرية ومليانة اختيارات", icon: "◒" }
];

export const initialPlayers: Player[] = [
  { id: "you", name: "أنت", initials: "أ", color: "#f5b942", points: 248, coins: 86, isYou: true, state: "thinking" },
  { id: "salma", name: "سلمى", initials: "س", color: "#7ce0c0", points: 318, coins: 124, isDrawer: true, state: "ready" },
  { id: "youssef", name: "يوسف", initials: "ي", color: "#ff8e6e", points: 287, coins: 109, state: "thinking" },
  { id: "nour", name: "نور", initials: "ن", color: "#b9a7ff", points: 263, coins: 96, state: "thinking" }
];

export const initialMessages: ChatMessage[] = [
  { id: 1, author: "النظام", text: "سلمى اختارت كلمة سرية… ركّزوا في كل خط.", kind: "system", time: "الآن" },
  { id: 2, author: "يوسف", text: "حاسس إنها حاجة بتتحرك؟", kind: "guess", time: "منذ 6 ثواني" },
  { id: 3, author: "نور", text: "قلم؟", kind: "guess", time: "منذ 3 ثواني" }
];

export function normalizeGuess(value: string) {
  return value.trim().toLocaleLowerCase("ar").replace(/[ًٌٍَُِّْـ]/g, "").replace(/\s+/g, " ");
}

export function timeLabel(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
