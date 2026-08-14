import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: me } = await supabase
    .from("users")
    .select("school")
    .eq("id", session.userId)
    .maybeSingle();

  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, description, hint, target_school")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  const { data: answered } = await supabase
    .from("guesses")
    .select("question_id")
    .eq("user_id", session.userId);

  const { data: unlockedHints } = await supabase
    .from("hint_unlocks")
    .select("question_id")
    .eq("user_id", session.userId);

  const answeredIds = new Set((answered || []).map((a) => a.question_id));
  const unlockedIds = new Set((unlockedHints || []).map((h) => h.question_id));

  const remaining = (questions || [])
    .filter((q) => !answeredIds.has(q.id))
    .filter((q) => !q.target_school || q.target_school === me?.school)
    .map((q) => {
      const hintUnlocked = unlockedIds.has(q.id);
      return {
        id: q.id,
        description: q.description,
        hintUnlocked,
        hint: hintUnlocked ? q.hint : undefined
      };
    });

  return NextResponse.json({ questions: remaining, solvedCount: answeredIds.size });
}
