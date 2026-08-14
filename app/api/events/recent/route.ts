import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: events } = await supabase
    .from("events")
    .select("id, type, payload, created_at, users(nickname)")
    .order("created_at", { ascending: false })
    .limit(3);

  return NextResponse.json({ events: events || [] });
}
