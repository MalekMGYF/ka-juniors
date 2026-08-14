import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, nickname, school, points, coins, daily_points, created_at")
    .order("created_at", { ascending: false });

  if (error) return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  return noStoreJson({ users: data });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });

  const supabase = supabaseServer();

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    return noStoreJson({ error: "حصل خطأ في المسح: " + error.message }, { status: 500 });
  }

  // تأكيد إن الحساب فعلاً اتمسح من قاعدة البيانات قبل ما نرجع نجاح
  const { data: stillExists } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (stillExists) {
    return noStoreJson(
      { error: "الحساب لسه موجود بعد المحاولة، جرب تاني" },
      { status: 500 }
    );
  }

  return noStoreJson({ success: true });
}
