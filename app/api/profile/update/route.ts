import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getSessionFromCookies } from "../../../../lib/auth";
import { normalizeInstagramUsername } from "../../../../lib/instagram";
import { SCHOOLS } from "../../../../lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { fullName, nickname, instagram, school } = await req.json();

  if (!fullName || !nickname || !instagram) {
    return NextResponse.json({ error: "لازم تملى كل الخانات" }, { status: 400 });
  }
  if (String(fullName).trim().split(/\s+/).length < 3) {
    return NextResponse.json(
      { error: "اكتب الاسم ثلاثي (ثلاث كلمات على الأقل)" },
      { status: 400 }
    );
  }

  const trimmedNickname = String(nickname).trim();
  if (trimmedNickname.length < 2) {
    return NextResponse.json({ error: "اللقب لازم يكون حرفين على الأقل" }, { status: 400 });
  }

  const instagramUsername = normalizeInstagramUsername(instagram);
  if (!instagramUsername) {
    return NextResponse.json(
      { error: "اكتب يوزر انستا صحيح (حروف إنجليزي وأرقام و . و _ بس)" },
      { status: 400 }
    );
  }

  if (!SCHOOLS.some((item) => item.name === school)) {
    return NextResponse.json({ error: "اختار مدرسة من القايمة" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // نتأكد إن اللقب الجديد مش مستخدم عند حد تاني
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("nickname", trimmedNickname)
    .neq("id", session.userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "اللقب ده متسجل قبل كده لحد تاني" }, { status: 409 });
  }

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update({
      full_name: String(fullName).trim(),
      nickname: trimmedNickname,
      instagram_username: instagramUsername,
      school
    })
    .eq("id", session.userId)
    .select("nickname, full_name, instagram_username, school")
    .maybeSingle();

  if (error || !updatedUser) {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: updatedUser });
}
