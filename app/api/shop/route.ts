import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: items } = await supabase
    .from("shop_items")
    .select("id, name, description, cost, type, value")
    .order("cost", { ascending: true });

  const { data: purchases } = await supabase
    .from("user_purchases")
    .select("item_id, active")
    .eq("user_id", session.userId);

  const { data: me } = await supabase
    .from("users")
    .select("coins")
    .eq("id", session.userId)
    .maybeSingle();

  const purchaseMap = new Map((purchases || []).map((p) => [p.item_id, p.active]));

  const result = (items || []).map((item) => ({
    ...item,
    owned: purchaseMap.has(item.id),
    active: purchaseMap.get(item.id) || false
  }));

  return noStoreJson({ items: result, coins: me?.coins || 0 });
}
