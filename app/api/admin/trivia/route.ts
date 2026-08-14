import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: questions } = await supabase
    .from("trivia_questions")
    .select("id, question_text, options, correct_index, is_active, activated_at, created_at")
    .order("created_at", { ascending: false });

  const questionIds = (questions || []).map((q) => q.id);
  let answerCounts: Record<string, number> = {};
  let correctCounts: Record<string, number> = {};

  if (questionIds.length > 0) {
    const { data: answers } = await supabase
      .from("trivia_answers")
      .select("question_id, is_correct")
      .in("question_id", questionIds);

    for (const a of answers || []) {
      answerCounts[a.question_id] = (answerCounts[a.question_id] || 0) + 1;
      if (a.is_correct) {
        correctCounts[a.question_id] = (correctCounts[a.question_id] || 0) + 1;
      }
    }
  }

  const enriched = (questions || []).map((q) => ({
    ...q,
    answersCount: answerCounts[q.id] || 0,
    correctCount: correctCounts[q.id] || 0
  }));

  return noStoreJson({ questions: enriched });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const { questionText, options, correctIndex } = await req.json();

  if (!questionText || !questionText.trim()) {
    return noStoreJson({ error: "اكتب نص السؤال" }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length !== 4 || options.some((o) => !o || !o.trim())) {
    return noStoreJson({ error: "لازم أربع اختيارات كلها متملية" }, { status: 400 });
  }
  if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex > 3) {
    return noStoreJson({ error: "حدد الإجابة الصحيحة" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("trivia_questions").insert({
    question_text: questionText.trim(),
    options: options.map((o: string) => o.trim()),
    correct_index: correctIndex,
    is_active: false
  });

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  return noStoreJson({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const { questionId } = await req.json();
  if (!questionId) {
    return noStoreJson({ error: "مفيش سؤال محدد" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: question } = await supabase
    .from("trivia_questions")
    .select("is_active")
    .eq("id", questionId)
    .maybeSingle();

  if (question?.is_active) {
    return noStoreJson({ error: "متقدرش تشيل سؤال شغال دلوقتي، وقفه الأول" }, { status: 409 });
  }

  const { error } = await supabase.from("trivia_questions").delete().eq("id", questionId);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  return noStoreJson({ success: true });
}
