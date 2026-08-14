export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // بعض المتصفحات ممكن ترفض، تجاهل بهدوء
    }
  }
}

export const HAPTIC = {
  win: [40, 30, 60],
  levelUp: [50, 40, 50, 40, 100],
  tap: 15
};
