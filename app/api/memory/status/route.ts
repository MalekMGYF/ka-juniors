import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { startOfTodayISO } from "../../../../lib/daily-reset";
import { MAX_DAILY_PLAYS } from "../../../../lib/memory-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

  return NextResponse.json({
    max: MAX_DAILY_PLAYS,
    playedToday,
    remaining: Math.max(0, MAX_DAILY_PLAYS - playedToday)
  });
}
