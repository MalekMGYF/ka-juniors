import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data: taps } = await supabase.from("cheer_taps").select("school");

  const counts: Record<string, number> = {};
  (taps || []).forEach((t) => {
    counts[t.school] = (counts[t.school] || 0) + 1;
  });

  return NextResponse.json({ counts });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { school } = await req.json();
  if (!school) {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // بيمسح كل ضغطات التكبيس بتاعة المدرسة دي، فيرجع العداد صفر لكل الناس فورًا
  const { error } = await supabase.from("cheer_taps").delete().eq("school", school);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
