import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("last_seen_at", twoMinutesAgo);

  return noStoreJson({ count: count || 0 });
}
