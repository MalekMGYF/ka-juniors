import { supabaseServer } from "../../../../lib/supabase";
import { noStoreJson } from "../../../../lib/api-response";
import { getEquippedCosmeticsMap } from "../../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, nickname, avatar_url, trivia_points")
    .gt("trivia_points", 0)
    .order("trivia_points", { ascending: false })
    .limit(100);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  const cosmeticsMap = await getEquippedCosmeticsMap(supabase);

  const players = (data || []).map((u) => ({
    ...u,
    equippedFrameColor: cosmeticsMap[u.id]?.frameColor || null
  }));

  return noStoreJson({ players });
}
