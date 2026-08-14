import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { computeAchievementStats, getEquippedCosmetics } from "../../../../lib/server-stats";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { nickname: string } }) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: user } = await supabase
    .from("users")
    .select("id, nickname, full_name, school, points, coins, daily_points, avatar_url, created_at, instagram_username")
    .eq("nickname", params.nickname)
    .maybeSingle();

  if (!user) {
    return noStoreJson({ error: "الحساب مش موجود" }, { status: 404 });
  }

  const result = await computeAchievementStats(supabase, user.id);
  const cosmetics = await getEquippedCosmetics(supabase, user.id);

  return noStoreJson({
    profile: {
      nickname: user.nickname,
      full_name: user.full_name,
      school: user.school,
      points: user.points,
      coins: user.coins,
      daily_points: user.daily_points,
      avatar_url: user.avatar_url,
      instagram_username: user.instagram_username,
      created_at: user.created_at,
      equippedTitle: cosmetics.title,
      equippedFrameColor: cosmetics.frameColor
    },
    achievements: result?.achievements || [],
    stats: result?.stats || null
  });
}
