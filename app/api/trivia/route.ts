import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANSWER_WINDOW_MS = 10000; // عشر ثواني بالظبط من لحظة "ابدأ" بتاعة الطالب
const GRACE_MS = 2500; // هامش بسيط لتأخير الشبكة
const MIN_POINTS = 5;
const MAX_POINTS = 10;
const MIN_COINS = 3;
const MAX_COINS = 8;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  // الأسئلة اللي جاوب عليها الطالب ده قبل كده
  const { data: answered } = await supabase
    .from("trivia_answers")
    .select("question_id")
    .eq("user_id", session.userId);

  const answeredIds = (answered || []).map((a) => a.question_id);

  let query = supabase
    .from("trivia_questions")
    .select("id, question_text, options, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (answeredIds.length > 0) {
    query = query.not("id", "in", `(${answeredIds.join(",")})`);
  }

  const { data: questions } = await query;
  const question = questions && questions.length > 0 ? questions[0] : null;

  if (!question) {
    return noStoreJson({ question: null, myStart: null, serverNow: new Date().toISOString() });
  }

  const { data: myStart } = await supabase
    .from("trivia_starts")
    .select("started_at")
    .eq("question_id", question.id)
    .eq("user_id", session.userId)
    .maybeSingle();

  return noStoreJson({
    question: {
      id: question.id,
      question_text: question.question_text,
      options: question.options
    },
    myStart: myStart?.started_at || null,
    serverNow: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { questionId, selectedIndex, skipExpired } = await req.json();
  if (!questionId || (!skipExpired && typeof selectedIndex !== "number")) {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: question } = await supabase
    .from("trivia_questions")
    .select("id, correct_index, is_active")
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

  const { data: start } = await supabase
    .from("trivia_starts")
    .select("started_at")
    .eq("question_id", questionId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!start) {
    return noStoreJson({ error: "لازم تدوس ابدأ الأول" }, { status: 409 });
  }

  const startedAt = new Date(start.started_at).getTime();
  const elapsedMs = Date.now() - startedAt;

  if (skipExpired) {
    if (elapsedMs < ANSWER_WINDOW_MS) {
      return noStoreJson({ error: "استنى لحد ما الوقت يخلص" }, { status: 409 });
    }
    const { error: skipError } = await supabase.from("trivia_answers").insert({
      question_id: questionId,
      user_id: session.userId,
      selected_index: -1,
      is_correct: false,
      answer_ms: ANSWER_WINDOW_MS,
      points_earned: 0
    });
    if (skipError) return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
    return noStoreJson({ skipped: true });
  }

  if (elapsedMs > ANSWER_WINDOW_MS + GRACE_MS) {
    return noStoreJson({ error: "خلصت العشر ثواني، فاتك السؤال ده" }, { status: 409 });
  }

  const cappedElapsed = Math.min(elapsedMs, ANSWER_WINDOW_MS);
  const isCorrect = selectedIndex === question.correct_index;

  let pointsEarned = 0;
  let coinsEarned = 0;
  if (isCorrect) {
    const speedRatio = 1 - cappedElapsed / ANSWER_WINDOW_MS; // 1 = فوري, 0 = آخر لحظة
    pointsEarned = Math.round(MIN_POINTS + speedRatio * (MAX_POINTS - MIN_POINTS));
    coinsEarned = Math.round(MIN_COINS + speedRatio * (MAX_COINS - MIN_COINS));
  }

  const { error: insertError } = await supabase.from("trivia_answers").insert({
    question_id: questionId,
    user_id: session.userId,
    selected_index: selectedIndex,
    is_correct: isCorrect,
    answer_ms: cappedElapsed,
    points_earned: pointsEarned
  });

  if (insertError) {
    return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  if (pointsEarned > 0) {
    const { data: user } = await supabase
      .from("users")
      .select("coins, trivia_points")
      .eq("id", session.userId)
      .single();

    const newTriviaPoints = (user?.trivia_points || 0) + pointsEarned;
    const newCoins = (user?.coins || 0) + coinsEarned;

    await supabase
      .from("users")
      .update({ trivia_points: newTriviaPoints, coins: newCoins })
      .eq("id", session.userId);
  }

  return noStoreJson({
    correct: isCorrect,
    correctIndex: question.correct_index,
    pointsEarned,
    coinsEarned
  });
}
