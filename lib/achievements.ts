export type AchievementStats = {
  correctGuesses: number;
  coins: number;
  hintsBought: number;
  dailyCorrect: number;
  dailyFirstFive: number;
  totalPoints: number;
  topRank: number | null;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (s: AchievementStats) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-answer",
    title: "أول خطوة",
    description: "جاوبت أول سؤال صح في خمن الطالب",
    icon: "🎯",
    check: (s) => s.correctGuesses >= 1
  },
  {
    id: "five-answers",
    title: "عارف الكل",
    description: "جاوبت 5 أسئلة صح في خمن الطالب",
    icon: "🕵️",
    check: (s) => s.correctGuesses >= 5
  },
  {
    id: "fifteen-answers",
    title: "الأسطورة",
    description: "جاوبت 15 سؤال صح في خمن الطالب",
    icon: "🧠",
    check: (s) => s.correctGuesses >= 15
  },
  {
    id: "coins-50",
    title: "الثري",
    description: "جمعت 50 كوين",
    icon: "💰",
    check: (s) => s.coins >= 50
  },
  {
    id: "coins-200",
    title: "المليونير",
    description: "جمعت 200 كوين",
    icon: "💎",
    check: (s) => s.coins >= 200
  },
  {
    id: "hint-1",
    title: "الفضولي",
    description: "اشتريت أول تلميح",
    icon: "🔍",
    check: (s) => s.hintsBought >= 1
  },
  {
    id: "hint-5",
    title: "محقق محترف",
    description: "اشتريت 5 تلميحات",
    icon: "🕶️",
    check: (s) => s.hintsBought >= 5
  },
  {
    id: "daily-first",
    title: "السباق الأول",
    description: "كنت من أول 5 في سؤال يومي",
    icon: "🥇",
    check: (s) => s.dailyFirstFive >= 1
  },
  {
    id: "daily-5",
    title: "المواظب",
    description: "جاوبت صح في 5 أسئلة يومية",
    icon: "📅",
    check: (s) => s.dailyCorrect >= 5
  },
  {
    id: "top3",
    title: "نجم الترتيب",
    description: "وصلت لأعلى 3 في الترتيب العام",
    icon: "🏆",
    check: (s) => s.topRank !== null && s.topRank <= 3
  },
  {
    id: "top1",
    title: "الملك",
    description: "وصلت للمركز الأول في الترتيب العام",
    icon: "👑",
    check: (s) => s.topRank !== null && s.topRank === 1
  },
  {
    id: "max-level",
    title: "أسطورة K.A",
    description: "وصلت لأعلى مستوى في الموقع",
    icon: "✨",
    check: (s) => s.totalPoints >= 400
  }
];
