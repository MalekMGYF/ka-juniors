import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { computeAchievementStats } from "../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const result = await computeAchievementStats(supabase, session.userId);

  if (!result) {
    return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
  }

  return NextResponse.json({ achievements: result.achievements, stats: result.stats });
}
