import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANSWER_WINDOW_MS = 40_000;
const GRACE_MS = 2_500;
const CORRECT_POINTS = 5;
const WRONG_POINTS = 1;

function audioUrl(path: string | null | undefined) {
  if (!path) return null;
  const supabase = supabaseServer();
  return supabase.storage.from("song-audio").getPublicUrl(path).data.publicUrl;
}

async function unansweredQuestionForUser(userId: string) {
  const supabase = supabaseServer();
  const { data: answered } = await supabase
    .from("song_complete_answers")
    .select("question_id")
    .eq("user_id", userId);
  const answeredIds = (answered || []).map((item) => item.question_id);

  let query = supabase
    .from("song_complete_questions")
    .select("id, title, prompt_text, full_line, options, correct_index, intro_audio_path, full_audio_path, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (answeredIds.length) query = query.not("id", "in", `(${answeredIds.join(",")})`);
  const { data } = await query;
  if (!data?.length) return null;

  const { data: starts } = await supabase
    .from("song_complete_starts")
    .select("question_id, started_at")
    .eq("user_id", userId)
    .in("question_id", data.map((item) => item.id));
  const existingStart = (starts || []).sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())[0];
  if (existingStart) {
    const startedQuestion = data.find((item) => item.id === existingStart.question_id);
    if (startedQuestion) return { question: startedQuestion, startedAt: existingStart.started_at };
  }

  const choice = data[Math.floor(Math.random() * data.length)];
  return { question: choice, startedAt: null };
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });

  const item = await unansweredQuestionForUser(session.userId);
  if (!item) return noStoreJson({ question: null, startedAt: null, serverNow: new Date().toISOString() });

  if (!item.startedAt) {
    return noStoreJson({
      question: { id: item.question.id, title: item.question.title },
      startedAt: null,
      serverNow: new Date().toISOString()
    });
  }

  return noStoreJson({
    question: {
      id: item.question.id,
      title: item.question.title,
      promptText: item.question.prompt_text,
      options: item.question.options,
      introAudioUrl: audioUrl(item.question.intro_audio_path)
    },
    startedAt: item.startedAt,
    serverNow: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const action = body.action === "timeout" ? "timeout" : "answer";
  const selectedIndex = Number(body.selectedIndex);
  if (!questionId || (action === "answer" && (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3))) {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: question } = await supabase
    .from("song_complete_questions")
    .select("id, correct_index, full_line, full_audio_path, is_active")
    .eq("id", questionId)
    .maybeSingle();
  if (!question || !question.is_active) return noStoreJson({ error: "السؤال ده مش متاح" }, { status: 404 });

  const { data: already } = await supabase
    .from("song_complete_answers")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (already) return noStoreJson({ error: "جاوبت السؤال ده قبل كده" }, { status: 409 });

  const { data: start } = await supabase
    .from("song_complete_starts")
    .select("started_at")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!start) return noStoreJson({ error: "دوس ابدأ الأول" }, { status: 409 });

  const elapsedMs = Date.now() - new Date(start.started_at).getTime();
  if (action === "timeout" && elapsedMs < ANSWER_WINDOW_MS) {
    return noStoreJson({ error: "الوقت لسه مخلصش" }, { status: 409 });
  }
  if (action === "answer" && elapsedMs > ANSWER_WINDOW_MS + GRACE_MS) {
    return noStoreJson({ error: "انتهى وقت السؤال" }, { status: 409 });
  }

  const isCorrect = action === "answer" && selectedIndex === question.correct_index;
  const pointsEarned = isCorrect ? CORRECT_POINTS : WRONG_POINTS;
  const answerMs = Math.min(Math.max(elapsedMs, 0), ANSWER_WINDOW_MS);
  const { error: answerError } = await supabase.from("song_complete_answers").insert({
    question_id: questionId,
    user_id: session.userId,
    selected_index: action === "timeout" ? -1 : selectedIndex,
    is_correct: isCorrect,
    answer_ms: answerMs,
    points_earned: pointsEarned
  });
  if (answerError) return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });

  const { data: user } = await supabase.from("users").select("song_points").eq("id", session.userId).single();
  await supabase.from("users").update({ song_points: (user?.song_points || 0) + pointsEarned }).eq("id", session.userId);

  return noStoreJson({
    correct: isCorrect,
    timedOut: action === "timeout",
    correctIndex: question.correct_index,
    fullLine: question.full_line,
    fullAudioUrl: audioUrl(question.full_audio_path),
    pointsEarned
  });
}
