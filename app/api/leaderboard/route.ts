import { supabaseServer } from "../../../lib/supabase";
import { noStoreJson } from "../../../lib/api-response";
import { getEquippedCosmeticsMap } from "../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, nickname, full_name, school, points, coins, avatar_url, daily_points")
    .order("points", { ascending: false })
    .order("coins", { ascending: false })
    .limit(200);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  const cosmeticsMap = await getEquippedCosmeticsMap(supabase);
  const { data: correctPictionaryGuesses } = await supabase.from("pictionary_messages").select("user_id").eq("is_correct", true).not("user_id", "is", null);
  const pictionaryPointsByUser = new Map<string, number>();
  (correctPictionaryGuesses || []).forEach((guess) => {
    if (!guess.user_id) return;
    pictionaryPointsByUser.set(guess.user_id, (pictionaryPointsByUser.get(guess.user_id) || 0) + 3);
  });

  const players = (data || []).map((u) => ({
    ...u,
    pictionary_points: pictionaryPointsByUser.get(u.id) || 0,
    equippedTitle: cosmeticsMap[u.id]?.title || null,
    equippedFrameColor: cosmeticsMap[u.id]?.frameColor || null
  }));

  return noStoreJson({ players });
}
