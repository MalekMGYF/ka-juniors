import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    .from("guesses")
    .select("id")
    .eq("user_id", session.userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true });
  }

  await supabase.from("guesses").insert({
    user_id: session.userId,
    question_id: questionId,
    correct: false
  });

  return NextResponse.json({ success: true });
}
