import { supabaseServer } from "../../../lib/supabase";
import { noStoreJson } from "../../../lib/api-response";
import { getEquippedCosmeticsMap } from "../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, nickname, full_name, school, points, coins, avatar_url, daily_points, trivia_points")
    .order("points", { ascending: false })
    .order("coins", { ascending: false })
    .limit(1000);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  const countRowsByUser = async (table: string, dateColumn: string, correctOnly = false) => {
    const counts = new Map<string, number>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabase.from(table).select("user_id").order(dateColumn, { ascending: true }).range(from, from + pageSize - 1);
      if (correctOnly) query = query.eq("is_correct", true);
      const { data: rows, error: rowsError } = await query;
      if (rowsError || !rows?.length) break;
      rows.forEach((row) => {
        if (row.user_id) counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
      });
      if (rows.length < pageSize) break;
    }
    return counts;
  };

  const [cosmeticsMap, pictionaryGuesses, cheerTaps, memoryPlays, wheelSpins] = await Promise.all([
    getEquippedCosmeticsMap(supabase),
    countRowsByUser("pictionary_messages", "created_at", true),
    countRowsByUser("cheer_taps", "created_at"),
    countRowsByUser("memory_plays", "played_at"),
    countRowsByUser("wheel_spins", "spun_at")
  ]);

  const players = (data || []).map((u) => ({
    ...u,
    pictionary_points: (pictionaryGuesses.get(u.id) || 0) * 3,
    cheer_taps: cheerTaps.get(u.id) || 0,
    memory_plays: memoryPlays.get(u.id) || 0,
    wheel_spins: wheelSpins.get(u.id) || 0,
    activity_points: (cheerTaps.get(u.id) || 0) + (memoryPlays.get(u.id) || 0) + (wheelSpins.get(u.id) || 0),
    general_score: (u.points || 0) + (u.daily_points || 0) + (u.trivia_points || 0) + (cheerTaps.get(u.id) || 0) + (memoryPlays.get(u.id) || 0) + (wheelSpins.get(u.id) || 0),
    equippedTitle: cosmeticsMap[u.id]?.title || null,
    equippedFrameColor: cosmeticsMap[u.id]?.frameColor || null
  }));

  return noStoreJson({ players });
}
