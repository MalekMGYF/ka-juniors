import { NextRequest } from "next/server";
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

  const { data: me } = await supabase
    .from("users")
    .select("school")
    .eq("id", session.userId)
    .maybeSingle();

  const { data: taps } = await supabase.from("cheer_taps").select("school");

  const counts: Record<string, number> = {};
  (taps || []).forEach((t) => {
    counts[t.school] = (counts[t.school] || 0) + 1;
  });

  return noStoreJson({ counts, mySchool: me?.school || null });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: me } = await supabase
    .from("users")
    .select("school")
    .eq("id", session.userId)
    .maybeSingle();

  if (!me?.school) {
    return noStoreJson({ error: "مفيش مدرسة مسجلة على حسابك" }, { status: 400 });
  }

  await supabase.from("cheer_taps").insert({
    school: me.school,
    user_id: session.userId
  });

  return noStoreJson({ success: true });
}
