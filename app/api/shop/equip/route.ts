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

  const { itemId, activate } = await req.json();
  if (!itemId || typeof activate !== "boolean") {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: purchase } = await supabase
    .from("user_purchases")
    .select("id, item_id")
    .eq("user_id", session.userId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (!purchase) {
    return noStoreJson({ error: "لازم تشتري العنصر ده الأول" }, { status: 404 });
  }

  const { data: item } = await supabase
    .from("shop_items")
    .select("type")
    .eq("id", itemId)
    .maybeSingle();

  if (activate && item) {
    // فك تفعيل أي عنصر تاني من نفس النوع (لقب واحد أو إطار واحد بس في المرة)
    const { data: sameTypeItems } = await supabase
      .from("shop_items")
      .select("id")
      .eq("type", item.type);

    const ids = (sameTypeItems || []).map((i) => i.id);
    if (ids.length > 0) {
      await supabase
        .from("user_purchases")
        .update({ active: false })
        .eq("user_id", session.userId)
        .in("item_id", ids);
    }
  }

  await supabase
    .from("user_purchases")
    .update({ active: activate })
    .eq("user_id", session.userId)
    .eq("item_id", itemId);

  return noStoreJson({ success: true });
}
