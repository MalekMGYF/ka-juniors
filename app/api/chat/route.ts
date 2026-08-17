import { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { containsProfanity } from "../../../lib/profanity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_MESSAGE_LENGTH = 300;
const FETCH_LIMIT = 60;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("id, message, created_at, user_id, users(nickname, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) {
    return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
  }

  const ordered = (messages || []).slice().reverse();

  return noStoreJson({
    messages: ordered.map((m: any) => ({
      id: m.id,
      message: m.message,
      createdAt: m.created_at,
      userId: m.user_id,
      nickname: m.users?.nickname || "؟",
      avatarUrl: m.users?.avatar_url || null
    }))
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || !message.trim()) {
    return noStoreJson({ error: "اكتب رسالة" }, { status: 400 });
  }

  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

  if (containsProfanity(trimmed)) {
    return noStoreJson(
      { error: "الرسالة فيها كلام مش مسموح بيه في الشات العام" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("chat_messages").insert({
    user_id: session.userId,
    message: trimmed
  });

  if (error) {
    return noStoreJson({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return noStoreJson({ success: true });
}
