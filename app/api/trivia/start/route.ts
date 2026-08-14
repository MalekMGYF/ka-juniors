import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { questionId } = await req.json();
  if (!questionId) {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: question } = await supabase
    .from("trivia_questions")
    .select("id, is_active")
    .eq("id", questionId)
    .maybeSingle();

  if (!question || !question.is_active) {
    return noStoreJson({ error: "السؤال ده مش شغال دلوقتي" }, { status: 404 });
  }

  const { data: already } = await supabase
    .from("trivia_answers")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (already) {
    return noStoreJson({ error: "جاوبت على السؤال ده قبل كده" }, { status: 409 });
  }

  // لو بدأ قبل كده، رجّعله نفس وقت البداية بدل ما نصفّره
  const { data: existingStart } = await supabase
    .from("trivia_starts")
    .select("started_at")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existingStart) {
    return noStoreJson({ startedAt: existingStart.started_at });
  }

  const startedAt = new Date().toISOString();
  const { error } = await supabase.from("trivia_starts").insert({
    question_id: questionId,
    user_id: session.userId,
    started_at: startedAt
  });

  if (error) {
    return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return noStoreJson({ startedAt });
}
