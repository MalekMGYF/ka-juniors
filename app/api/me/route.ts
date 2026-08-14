import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { getEquippedCosmetics } from "../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ user: null });
  }

  const supabase = supabaseServer();
  const { data: user } = await supabase
    .from("users")
    .select("nickname, full_name, school, points, coins, avatar_url, daily_points, instagram_username")
    .eq("id", session.userId)
    .maybeSingle();

  if (!user) {
    return noStoreJson({ user: null });
  }

  const cosmetics = await getEquippedCosmetics(supabase, session.userId);

  return noStoreJson({ user: { ...user, equippedTitle: cosmetics.title, equippedFrameColor: cosmetics.frameColor } });
}
