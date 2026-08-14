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
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  return NextResponse.json({ questions: data });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { description, answerName, hint, targetSchool } = await req.json();
  if (!description || !answerName) {
    return NextResponse.json({ error: "اكتب الوصف واسم الطالب" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("questions").insert({
    description: description.trim(),
    answer_name: answerName.trim(),
    hint: (hint || "").trim(),
    target_school: targetSchool || null,
    active: true
  });

  if (error) return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const { id, active } = await req.json();
  if (!id) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("questions").update({ active }).eq("id", id);
  if (error) return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  return NextResponse.json({ success: true });
}
