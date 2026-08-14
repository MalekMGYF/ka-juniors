import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COINS_PER_REFERRAL = 10;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: me } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", session.userId)
    .maybeSingle();

  const { count } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", session.userId);

  const invitedCount = count || 0;

  return noStoreJson({
    referralCode: me?.referral_code || null,
    invitedCount,
    coinsEarned: invitedCount * COINS_PER_REFERRAL
  });
}
