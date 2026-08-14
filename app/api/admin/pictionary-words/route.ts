import { NextRequest } from "next/server";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";
import { supabaseServer } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeWord(value: string) {
  return value.trim().toLocaleLowerCase("ar").replace(/[ًٌٍَُِّْـ]/g, "").replace(/\s+/g, " ");
}

function forbidden() {
  return noStoreJson({ error: "غير مصرح" }, { status: 401 });
}

export async function GET() {
  if (!getAdminFromCookies()) return forbidden();
  const { data, error } = await supabaseServer().from("pictionary_word_bank").select("id, word, is_active, created_at").order("created_at", { ascending: false });
  if (error) return noStoreJson({ error: "شغّل migration لعبة ارسم واتقال في Supabase أولًا" }, { status: 500 });
  return noStoreJson({ words: data || [] });
}

export async function POST(request: NextRequest) {
  if (!getAdminFromCookies()) return forbidden();
  const body = await request.json().catch(() => ({}));
  const word = typeof body.word === "string" ? body.word.trim().replace(/\s+/g, " ") : "";
  const normalizedWord = normalizeWord(word);
  if (word.length < 2 || word.length > 48) return noStoreJson({ error: "الكلمة لازم تكون بين حرفين و48 حرف" }, { status: 400 });
  const { error } = await supabaseServer().from("pictionary_word_bank").insert({ word, normalized_word: normalizedWord, is_active: true });
  if (error?.code === "23505") return noStoreJson({ error: "الكلمة دي موجودة بالفعل في البنك" }, { status: 409 });
  if (error) return noStoreJson({ error: "حصل خطأ أثناء إضافة الكلمة" }, { status: 500 });
  return noStoreJson({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!getAdminFromCookies()) return forbidden();
  const body = await request.json().catch(() => ({}));
  const wordId = typeof body.wordId === "string" ? body.wordId : "";
  if (!wordId) return noStoreJson({ error: "اختار كلمة للحذف" }, { status: 400 });
  const { error } = await supabaseServer().from("pictionary_word_bank").delete().eq("id", wordId);
  if (error) return noStoreJson({ error: "حصل خطأ أثناء حذف الكلمة" }, { status: 500 });
  return noStoreJson({ ok: true });
}
