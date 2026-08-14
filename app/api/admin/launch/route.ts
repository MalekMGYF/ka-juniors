import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { launchAt } = await req.json();

  const supabase = supabaseServer();

  // لو الأدمن بعت null أو فاضي، ده معناه إلغاء العداد خالص والموقع يشتغل عادي
  if (!launchAt) {
    const { error } = await supabase.from("site_settings").delete().eq("key", "launch_at");
    if (error) {
      return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
    }
    return NextResponse.json({ success: true, launchAt: null });
  }

  const parsed = new Date(launchAt);
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "الموعد غير صحيح" }, { status: 400 });
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "launch_at", value: parsed.toISOString() }, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, launchAt: parsed.toISOString() });
}
