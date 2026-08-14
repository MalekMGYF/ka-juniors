import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "launch_at")
    .maybeSingle();

  const launchAt = data?.value || null;
  const now = new Date();
  const isBeforeLaunch = !!launchAt && now.getTime() < new Date(launchAt).getTime();

  return NextResponse.json({
    launchAt,
    isBeforeLaunch,
    serverNow: now.toISOString()
  });
}
