import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { imageBase64 } = await req.json();
  if (!imageBase64 || !imageBase64.startsWith("data:image")) {
    return NextResponse.json({ error: "الصورة مش صالحة" }, { status: 400 });
  }

  const base64Data = imageBase64.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "الصورة كبيرة جدًا" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const path = `${session.userId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "حصل خطأ في رفع الصورة" }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", session.userId);

  return NextResponse.json({ avatarUrl });
}
