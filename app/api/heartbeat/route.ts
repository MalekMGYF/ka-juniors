import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();
  await supabase
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.userId);

  return noStoreJson({ success: true });
}
