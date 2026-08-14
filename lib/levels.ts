export type Level = {
  name: string;
  minPoints: number;
  color: string;
  icon: string;
};

export const LEVELS: Level[] = [
  { name: "زائر", minPoints: 0, color: "#9a9aa1", icon: "🌱" },
  { name: "متدرب", minPoints: 5, color: "#7ce0c0", icon: "🔰" },
  { name: "مجتهد", minPoints: 15, color: "#6fd1e8", icon: "📘" },
  { name: "شاطر", minPoints: 30, color: "#7c9cf0", icon: "⚡" },
  { name: "نجم صاعد", minPoints: 50, color: "#b98af5", icon: "🌟" },
  { name: "خبير", minPoints: 80, color: "#f08ad0", icon: "🎓" },
  { name: "محترف", minPoints: 120, color: "#f5b942", icon: "🏅" },
  { name: "بطل", minPoints: 170, color: "#f59642", icon: "🔥" },
  { name: "أسطورة", minPoints: 230, color: "#ff6b6b", icon: "🐉" },
  { name: "ملك المعرفة", minPoints: 300, color: "#ffd700", icon: "👑" },
  { name: "أسطورة K.A", minPoints: 400, color: "#ffffff", icon: "✨" }
];

export function getLevel(totalPoints: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalPoints >= lvl.minPoints) current = lvl;
  }
  return current;
}

export function getLevelIndex(totalPoints: number): number {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].minPoints) idx = i;
  }
  return idx;
}

export function getNextLevel(totalPoints: number): Level | null {
  for (const lvl of LEVELS) {
    if (totalPoints < lvl.minPoints) return lvl;
  }
  return null;
}
