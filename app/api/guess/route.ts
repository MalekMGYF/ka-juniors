import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { recordLevelUpIfNeeded, recordTopRankIfNeeded } from "../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalize(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { questionId, guess } = await req.json();
  if (!questionId || !guess) {
    return NextResponse.json({ error: "اكتب اسم الطالب" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: question } = await supabase
    .from("questions")
    .select("id, answer_name")
    .eq("id", questionId)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "السؤال ده مش موجود" }, { status: 404 });
  }

  const { data: already } = await supabase
    .from("guesses")
    .select("id")
    .eq("user_id", session.userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (already) {
    return NextResponse.json({ error: "جاوبت على السؤال ده قبل كده" }, { status: 409 });
  }

  const correct = normalize(guess) === normalize(question.answer_name);

  if (!correct) {
    return NextResponse.json({ correct: false });
  }

  await supabase.from("guesses").insert({
    user_id: session.userId,
    question_id: questionId,
    correct: true
  });

  const { data: user } = await supabase
    .from("users")
    .select("points, coins, daily_points")
    .eq("id", session.userId)
    .single();

  const oldTotal = (user?.points || 0) + (user?.daily_points || 0);
  const newPoints = (user?.points || 0) + 1;
  const newCoins = (user?.coins || 0) + 5;
  const newTotal = newPoints + (user?.daily_points || 0);

  await supabase
    .from("users")
    .update({ points: newPoints, coins: newCoins })
    .eq("id", session.userId);

  await recordLevelUpIfNeeded(supabase, session.userId, oldTotal, newTotal);
  await recordTopRankIfNeeded(supabase, session.userId);

  return NextResponse.json({ correct: true, points: newPoints, coins: newCoins });
}
