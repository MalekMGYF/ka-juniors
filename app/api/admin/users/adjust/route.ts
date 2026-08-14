import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../../lib/auth";
import { recordLevelUpIfNeeded, recordTopRankIfNeeded } from "../../../../../lib/server-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id, field, amount } = await req.json();

  if (!id || !["points", "coins", "daily_points"].includes(field) || typeof amount !== "number") {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: user } = await supabase
    .from("users")
    .select("points, coins, daily_points")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
  }

  const oldTotal = (user.points || 0) + (user.daily_points || 0);
  const current = (user as any)[field] as number;
  const newValue = Math.max(0, current + amount);

  const { error } = await supabase
    .from("users")
    .update({ [field]: newValue })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  if (field === "points" || field === "daily_points") {
    const newPoints = field === "points" ? newValue : user.points || 0;
    const newDaily = field === "daily_points" ? newValue : user.daily_points || 0;
    const newTotal = newPoints + newDaily;
    await recordLevelUpIfNeeded(supabase, id, oldTotal, newTotal);
    await recordTopRankIfNeeded(supabase, id);
  }

  return NextResponse.json({ success: true, newValue });
}
