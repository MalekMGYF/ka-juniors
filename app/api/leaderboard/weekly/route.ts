import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: guesses }, { data: dailyAnswers }, { data: cheers }] = await Promise.all([
    supabase
      .from("guesses")
      .select("user_id")
      .eq("correct", true)
      .gte("created_at", weekAgo),
    supabase
      .from("daily_answers")
      .select("user_id")
      .eq("status", "awarded")
      .gte("created_at", weekAgo),
    supabase.from("cheer_taps").select("user_id").gte("created_at", weekAgo)
  ]);

  const scores: Record<string, number> = {};
  (guesses || []).forEach((g) => {
    if (g.user_id) scores[g.user_id] = (scores[g.user_id] || 0) + 1;
  });
  (dailyAnswers || []).forEach((d) => {
    if (d.user_id) scores[d.user_id] = (scores[d.user_id] || 0) + 5;
  });
  (cheers || []).forEach((c) => {
    if (c.user_id) scores[c.user_id] = (scores[c.user_id] || 0) + 1;
  });

  const userIds = Object.keys(scores);
  if (userIds.length === 0) {
    return noStoreJson({ players: [] });
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, nickname, school, avatar_url")
    .in("id", userIds);

  const players = (users || [])
    .map((u) => ({ ...u, weeklyScore: scores[u.id] || 0 }))
    .sort((a, b) => b.weeklyScore - a.weeklyScore)
    .slice(0, 50);

  return noStoreJson({ players });
}
