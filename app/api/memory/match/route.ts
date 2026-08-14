import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: me } = await supabase
    .from("users")
    .select("coins")
    .eq("id", session.userId)
    .maybeSingle();

  if (!me) {
    return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
  }

  const newCoins = (me.coins || 0) + 1;

  const { error } = await supabase
    .from("users")
    .update({ coins: newCoins })
    .eq("id", session.userId);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, coins: newCoins });
}
