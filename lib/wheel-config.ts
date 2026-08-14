// Shared config for the daily wheel; route handlers may only export Next.js-supported route fields.
export const WHEEL_SEGMENTS: { reward: number; weight: number }[] = [
  { reward: 1, weight: 25 },
  { reward: 2, weight: 20 },
  { reward: 3, weight: 15 },
  { reward: 5, weight: 12 },
  { reward: 7, weight: 10 },
  { reward: 10, weight: 8 },
  { reward: 15, weight: 5 },
  { reward: 20, weight: 3 },
  { reward: 0, weight: 2 }
];
