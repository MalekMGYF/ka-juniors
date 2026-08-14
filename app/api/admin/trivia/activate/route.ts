import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../../lib/auth";
import { noStoreJson } from "../../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  }

  const { questionId, action } = await req.json();

  if (!["activate", "deactivate"].includes(action)) {
    return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();

  if (action === "deactivate") {
    if (!questionId) {
      return noStoreJson({ error: "مفيش سؤال محدد" }, { status: 400 });
    }
    await supabase
      .from("trivia_questions")
      .update({ is_active: false })
      .eq("id", questionId);
    return noStoreJson({ success: true });
  }

  // action === "activate"
  if (!questionId) {
    return noStoreJson({ error: "مفيش سؤال محدد" }, { status: 400 });
  }

  const { error } = await supabase
    .from("trivia_questions")
    .update({ is_active: true, activated_at: new Date().toISOString() })
    .eq("id", questionId);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  return noStoreJson({ success: true });
}
