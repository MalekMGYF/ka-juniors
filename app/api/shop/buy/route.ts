import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { itemId } = await req.json();
  if (!itemId) {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: item } = await supabase
    .from("shop_items")
    .select("id, cost")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return noStoreJson({ error: "العنصر مش موجود" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("user_purchases")
    .select("id")
    .eq("user_id", session.userId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    return noStoreJson({ error: "عندك العنصر ده بالفعل" }, { status: 409 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("coins")
    .eq("id", session.userId)
    .single();

  if (!user || user.coins < item.cost) {
    return noStoreJson({ error: "معندكش كوينات كفاية" }, { status: 402 });
  }

  await supabase
    .from("users")
    .update({ coins: user.coins - item.cost })
    .eq("id", session.userId);

  await supabase.from("user_purchases").insert({
    user_id: session.userId,
    item_id: itemId,
    active: false
  });

  return noStoreJson({ success: true, coins: user.coins - item.cost });
}
