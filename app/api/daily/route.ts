import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function findCurrentQuestion(supabase: any, school: string | null) {
  const { data: questions } = await supabase
    .from("daily_questions")
    .select("id, question_text, target_school, max_answerers, scheduled_at")
    .or(`target_school.is.null,target_school.eq.${school || "__none__"}`)
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: false })
    .limit(1);

  return questions && questions.length > 0 ? questions[0] : null;
}

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

  const question = await findCurrentQuestion(supabase, me?.school || null);

  if (!question) {
    return NextResponse.json({ question: null, mySubmission: null });
  }

  const { count: submissionsCount } = await supabase
    .from("daily_answers")
    .select("id", { count: "exact", head: true })
    .eq("daily_question_id", question.id);

  const { data: mySubmission } = await supabase
    .from("daily_answers")
    .select("id, answer_text, status, created_at")
    .eq("daily_question_id", question.id)
    .eq("user_id", session.userId)
    .maybeSingle();

  const nextRotationAt = new Date(
    new Date(question.scheduled_at).getTime() + 24 * 60 * 60 * 1000
  ).toISOString();

  const closed =
    question.max_answerers != null && (submissionsCount || 0) >= question.max_answerers;

  return NextResponse.json({
    question: {
      id: question.id,
      question_text: question.question_text,
      scheduledAt: question.scheduled_at,
      nextRotationAt
    },
    mySubmission: mySubmission || null,
    closed,
    submissionsCount: submissionsCount || 0,
    maxAnswerers: question.max_answerers
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { answerText } = await req.json();
  if (!answerText || !answerText.trim()) {
    return NextResponse.json({ error: "اكتب إجابة" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: me } = await supabase
    .from("users")
    .select("school")
    .eq("id", session.userId)
    .maybeSingle();

  const question = await findCurrentQuestion(supabase, me?.school || null);

  if (!question) {
    return NextResponse.json({ error: "مفيش سؤال يومي دلوقتي" }, { status: 404 });
  }

  const { count: submissionsCount } = await supabase
    .from("daily_answers")
    .select("id", { count: "exact", head: true })
    .eq("daily_question_id", question.id);

  if (question.max_answerers != null && (submissionsCount || 0) >= question.max_answerers) {
    return NextResponse.json(
      { error: "العدد المسموح بيه خلص، استنى السؤال الجاي بكرة" },
      { status: 409 }
    );
  }

  const { data: existing } = await supabase
    .from("daily_answers")
    .select("id")
    .eq("daily_question_id", question.id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "جاوبت على السؤال ده قبل كده" }, { status: 409 });
  }

  const { error } = await supabase.from("daily_answers").insert({
    daily_question_id: question.id,
    user_id: session.userId,
    answer_text: answerText.trim(),
    status: "pending"
  });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
