import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { startOfTodayISO } from "../../../../lib/daily-reset";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_DAILY_PLAYS = 5;

export async function POST() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { count } = await supabase
    .from("memory_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .gte("played_at", startOfTodayISO());

  const playedToday = count || 0;
  if (playedToday >= MAX_DAILY_PLAYS) {
    return NextResponse.json(
      { error: "خلصت محاولاتك النهاردة، ارجع بكرة" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("memory_plays").insert({ user_id: session.userId });
  if (error) {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return NextResponse.json({ success: true, remaining: MAX_DAILY_PLAYS - playedToday - 1 });
}
