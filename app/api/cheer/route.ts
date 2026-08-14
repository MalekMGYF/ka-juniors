import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { SCHOOLS } from "../../../lib/schools";

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

  const schoolCounts = await Promise.all(
    SCHOOLS.map(async ({ name }) => {
      const { count, error } = await supabase.from("cheer_taps").select("id", { count: "exact", head: true }).eq("school", name);
      return [name, error ? 0 : count || 0] as const;
    })
  );
  const counts = Object.fromEntries(schoolCounts);

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

  const { error: insertError } = await supabase.from("cheer_taps").insert({
    school: me.school,
    user_id: session.userId
  });
  if (insertError) return noStoreJson({ error: "حصل خطأ أثناء تسجيل التكبيس" }, { status: 500 });

  const { count, error: countError } = await supabase.from("cheer_taps").select("id", { count: "exact", head: true }).eq("school", me.school);
  return noStoreJson({ success: true, school: me.school, count: countError ? null : count || 0 });
}
