import { getLevelIndex, LEVELS } from "./levels";
import { ACHIEVEMENTS, AchievementStats } from "./achievements";

export async function computeAchievementStats(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("points, coins, daily_points")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  const { count: correctGuesses } = await supabase
    .from("guesses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("correct", true);

  const { count: hintsBought } = await supabase
    .from("hint_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: dailyAwarded } = await supabase
    .from("daily_answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "awarded");

  const { count: dailyLate } = await supabase
    .from("daily_answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "late");

  const totalPoints = (user.points || 0) + (user.daily_points || 0);

  const { data: allUsers } = await supabase.from("users").select("id, points, daily_points");

  let topRank: number | null = null;
  if (allUsers) {
    const sorted = [...allUsers].sort(
      (a: any, b: any) => b.points + b.daily_points - (a.points + a.daily_points)
    );
    const idx = sorted.findIndex((u: any) => u.id === userId);
    if (idx !== -1) topRank = idx + 1;
  }

  const stats: AchievementStats = {
    correctGuesses: correctGuesses || 0,
    coins: user.coins || 0,
    hintsBought: hintsBought || 0,
    dailyCorrect: (dailyAwarded || 0) + (dailyLate || 0),
    dailyFirstFive: dailyAwarded || 0,
    totalPoints,
    topRank
  };

  const achievements = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlocked: a.check(stats)
  }));

  return { stats, achievements, user };
}

export async function getEquippedCosmetics(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_purchases")
    .select("shop_items(type, value)")
    .eq("user_id", userId)
    .eq("active", true);

  let title: string | null = null;
  let frameColor: string | null = null;
  (data || []).forEach((row: any) => {
    if (row.shop_items?.type === "title") title = row.shop_items.value;
    if (row.shop_items?.type === "frame_color") frameColor = row.shop_items.value;
  });

  return { title, frameColor };
}

export async function getEquippedCosmeticsMap(supabase: any) {
  const { data } = await supabase
    .from("user_purchases")
    .select("user_id, shop_items(type, value)")
    .eq("active", true);

  const map: Record<string, { title: string | null; frameColor: string | null }> = {};
  (data || []).forEach((row: any) => {
    if (!map[row.user_id]) map[row.user_id] = { title: null, frameColor: null };
    if (row.shop_items?.type === "title") map[row.user_id].title = row.shop_items.value;
    if (row.shop_items?.type === "frame_color") map[row.user_id].frameColor = row.shop_items.value;
  });
  return map;
}
export async function recordLevelUpIfNeeded(
  supabase: any,
  userId: string,
  oldTotal: number,
  newTotal: number
) {
  const oldIdx = getLevelIndex(oldTotal);
  const newIdx = getLevelIndex(newTotal);
  if (newIdx > oldIdx) {
    await supabase.from("events").insert({
      type: "level_up",
      user_id: userId,
      payload: LEVELS[newIdx].name
    });
  }
}

// يسجل حدث "اتصدار الترتيب" لو الشخص ده بقى الأول ومكانش قبل كده
export async function recordTopRankIfNeeded(supabase: any, userId: string) {
  const { data: allUsers } = await supabase.from("users").select("id, points, daily_points");
  if (!allUsers || allUsers.length === 0) return;

  const sorted = [...allUsers].sort(
    (a: any, b: any) => b.points + b.daily_points - (a.points + a.daily_points)
  );
  const currentTop = sorted[0];
  if (currentTop.id !== userId) return;

  const { data: lastTopEvent } = await supabase
    .from("events")
    .select("user_id")
    .eq("type", "top_rank")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastTopEvent || lastTopEvent.user_id !== userId) {
    await supabase.from("events").insert({
      type: "top_rank",
      user_id: userId,
      payload: null
    });
  }
}
