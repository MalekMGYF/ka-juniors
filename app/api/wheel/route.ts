import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { startOfTodayISO } from "../../../lib/daily-reset";
import { WHEEL_SEGMENTS } from "../../../lib/wheel-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// الجوايز والاحتمالات بتاعتها (من غير أي مكتبات خارجية)، الجوايز الصغيرة أكتر شيوعًا
export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: lastSpin } = await supabase
    .from("wheel_spins")
    .select("reward, spun_at")
    .eq("user_id", session.userId)
    .gte("spun_at", startOfTodayISO())
    .order("spun_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    canSpin: !lastSpin,
    lastReward: lastSpin?.reward ?? null,
    segments: WHEEL_SEGMENTS.map((s) => s.reward)
  });
}

function pickWeightedReward() {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const segment of WHEEL_SEGMENTS) {
    if (roll < segment.weight) return segment.reward;
    roll -= segment.weight;
  }
  return WHEEL_SEGMENTS[0].reward;
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: lastSpin } = await supabase
    .from("wheel_spins")
    .select("id")
    .eq("user_id", session.userId)
    .gte("spun_at", startOfTodayISO())
    .limit(1)
    .maybeSingle();

  if (lastSpin) {
    return NextResponse.json({ error: "لفيت العجلة النهاردة خلاص، ارجع بكرة" }, { status: 409 });
  }

  const reward = pickWeightedReward();

  const { error } = await supabase.from("wheel_spins").insert({
    user_id: session.userId,
    reward
  });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  if (reward > 0) {
    const { data: me } = await supabase
      .from("users")
      .select("coins")
      .eq("id", session.userId)
      .maybeSingle();

    if (me) {
      await supabase
        .from("users")
        .update({ coins: (me.coins || 0) + reward })
        .eq("id", session.userId);
    }
  }

  return NextResponse.json({ success: true, reward });
}
