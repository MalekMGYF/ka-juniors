import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HINT_COST = 10;

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { questionId } = await req.json();
  if (!questionId) {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: existing } = await supabase
    .from("hint_unlocks")
    .select("id")
    .eq("user_id", session.userId)
    .eq("question_id", questionId)
    .maybeSingle();

  const { data: question } = await supabase
    .from("questions")
    .select("hint")
    .eq("id", questionId)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "السؤال مش موجود" }, { status: 404 });
  }

  if (existing) {
    return NextResponse.json({ hint: question.hint });
  }

  const { data: user } = await supabase
    .from("users")
    .select("coins")
    .eq("id", session.userId)
    .single();

  if (!user || user.coins < HINT_COST) {
    return NextResponse.json({ error: "معندكش كوينات كفاية" }, { status: 402 });
  }

  await supabase
    .from("users")
    .update({ coins: user.coins - HINT_COST })
    .eq("id", session.userId);

  await supabase.from("hint_unlocks").insert({
    user_id: session.userId,
    question_id: questionId
  });

  return NextResponse.json({ hint: question.hint, coins: user.coins - HINT_COST });
}
