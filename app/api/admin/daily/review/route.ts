import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../../lib/auth";
import { recordLevelUpIfNeeded, recordTopRankIfNeeded } from "../../../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAILY_REWARD_POINTS = 5;
const FIRST_N_WINNERS = 5;

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { answerId, decision } = await req.json();
  if (!answerId || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: answer } = await supabase
    .from("daily_answers")
    .select("id, daily_question_id, user_id, status")
    .eq("id", answerId)
    .maybeSingle();

  if (!answer) {
    return NextResponse.json({ error: "الإجابة مش موجودة" }, { status: 404 });
  }

  if (answer.status !== "pending") {
    return NextResponse.json({ error: "الإجابة دي اتراجعت قبل كده" }, { status: 409 });
  }

  if (decision === "reject") {
    await supabase
      .from("daily_answers")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", answerId);
    return NextResponse.json({ success: true, status: "rejected" });
  }

  // decision === "approve"
  const { count: awardedCount } = await supabase
    .from("daily_answers")
    .select("id", { count: "exact", head: true })
    .eq("daily_question_id", answer.daily_question_id)
    .eq("status", "awarded");

  const withinLimit = (awardedCount || 0) < FIRST_N_WINNERS;
  const newStatus = withinLimit ? "awarded" : "late";

  await supabase
    .from("daily_answers")
    .update({ status: newStatus, reviewed_at: new Date().toISOString() })
    .eq("id", answerId);

  if (withinLimit) {
    const { data: user } = await supabase
      .from("users")
      .select("points, daily_points")
      .eq("id", answer.user_id)
      .single();

    const oldTotal = (user?.points || 0) + (user?.daily_points || 0);
    const newDailyPoints = (user?.daily_points || 0) + DAILY_REWARD_POINTS;
    const newTotal = (user?.points || 0) + newDailyPoints;

    await supabase
      .from("users")
      .update({ daily_points: newDailyPoints })
      .eq("id", answer.user_id);

    await recordLevelUpIfNeeded(supabase, answer.user_id, oldTotal, newTotal);
    await recordTopRankIfNeeded(supabase, answer.user_id);
  }

  return NextResponse.json({ success: true, status: newStatus });
}
