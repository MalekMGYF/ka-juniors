import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { SCHOOLS } from "../../../../lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const schoolCounts = await Promise.all(
    SCHOOLS.map(async ({ name }) => {
      const { count, error } = await supabase.from("cheer_taps").select("id", { count: "exact", head: true }).eq("school", name);
      return [name, error ? 0 : count || 0] as const;
    })
  );
  const counts = Object.fromEntries(schoolCounts);

  return NextResponse.json({ counts });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { school, confirmation } = await req.json();
  if (!school || confirmation !== school) {
    return NextResponse.json({ error: "اكتب اسم المدرسة كاملًا لتأكيد التصفير" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // بيمسح كل ضغطات التكبيس بتاعة المدرسة دي، فيرجع العداد صفر لكل الناس فورًا
  const { error } = await supabase.from("cheer_taps").delete().eq("school", school);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
