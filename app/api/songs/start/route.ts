import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  const { questionId } = await req.json().catch(() => ({}));
  if (typeof questionId !== "string" || !questionId) return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });

  const supabase = supabaseServer();
  const { data: question } = await supabase
    .from("song_complete_questions")
    .select("id, is_active")
    .eq("id", questionId)
    .maybeSingle();
  if (!question?.is_active) return noStoreJson({ error: "السؤال غير متاح" }, { status: 404 });

  const { data: alreadyAnswered } = await supabase
    .from("song_complete_answers")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (alreadyAnswered) return noStoreJson({ error: "جاوبت السؤال ده قبل كده" }, { status: 409 });

  const { data: existing } = await supabase
    .from("song_complete_starts")
    .select("started_at")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (existing) return noStoreJson({ startedAt: existing.started_at });

  const startedAt = new Date().toISOString();
  const { error } = await supabase.from("song_complete_starts").insert({ question_id: questionId, user_id: session.userId, started_at: startedAt });
  if (error) {
    const { data: racedStart } = await supabase
      .from("song_complete_starts")
      .select("started_at")
      .eq("question_id", questionId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (racedStart) return noStoreJson({ startedAt: racedStart.started_at });
    return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }
  return noStoreJson({ startedAt });
}
