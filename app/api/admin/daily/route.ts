import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: questions } = await supabase
    .from("daily_questions")
    .select("id, question_text, target_school, max_answerers, scheduled_at")
    .order("scheduled_at", { ascending: false })
    .limit(20);

  const results: any[] = [];
  for (const q of questions || []) {
    const { data: submissions } = await supabase
      .from("daily_answers")
      .select("id, answer_text, status, created_at, user_id, users(nickname, full_name)")
      .eq("daily_question_id", q.id)
      .order("created_at", { ascending: true });

    results.push({
      ...q,
      isCurrent: new Date(q.scheduled_at) <= new Date(),
      submissions: submissions || []
    });
  }

  return NextResponse.json({ questions: results });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { questionText, targetSchool, maxAnswerers } = await req.json();
  if (!questionText || !questionText.trim()) {
    return NextResponse.json({ error: "اكتب نص السؤال" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const scope = targetSchool || null;

  let query = supabase.from("daily_questions").select("scheduled_at");
  query = scope ? query.eq("target_school", scope) : query.is("target_school", null);

  const { data: existing } = await query.order("scheduled_at", { ascending: false }).limit(1);

  let scheduledAt = new Date();
  if (existing && existing.length > 0) {
    scheduledAt = new Date(new Date(existing[0].scheduled_at).getTime() + 24 * 60 * 60 * 1000);
  }

  const { error } = await supabase.from("daily_questions").insert({
    question_text: questionText.trim(),
    target_school: scope,
    max_answerers: maxAnswerers || null,
    scheduled_at: scheduledAt.toISOString()
  });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString() });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // حذف السؤال بيمسح معاه كل إجاباته تلقائي (on delete cascade)
  const { error } = await supabase.from("daily_questions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
