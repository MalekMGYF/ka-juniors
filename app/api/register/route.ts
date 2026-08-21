import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "../../../lib/supabase";
import { createUserSessionToken, sessionCookieName } from "../../../lib/auth";
import { normalizeInstagramUsername } from "../../../lib/instagram";
import { SCHOOLS } from "../../../lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // من غير حروف/أرقام بتتلخبط زي O/0 و I/1

function randomReferralCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  }
  return code;
}

async function generateUniqueReferralCode(supabase: any) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomReferralCode();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  // fallback نادر جدًا لو الصدفة كررت الكود كذا مرة
  return `${randomReferralCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`.slice(0, 6);
}

function registrationErrorMessage(error: unknown) {
  const dbError = error as { code?: string; message?: string } | null;
  const code = dbError?.code || "";
  const message = dbError?.message || "";
  if (message.includes("Supabase env vars")) return "إعدادات Supabase ناقصة على Vercel. أضف NEXT_PUBLIC_SUPABASE_URL وSUPABASE_SERVICE_ROLE_KEY ثم أعد النشر.";
  if (code === "23514" && message.toLowerCase().includes("school")) return "قاعدة البيانات لم تُحدَّث لقبول المدارس الجديدة. شغّل ملف SQL تحديث المدارس في Supabase ثم جرّب تاني.";
  if (code === "23505") return "اللقب أو يوزر الإنستجرام ده متسجل قبل كده.";
  return "حصل خطأ في التسجيل. جرّب تاني بعد التأكد من إعدادات Supabase.";
}

export async function POST(req: NextRequest) {
  try {
    const { fullName, nickname, instagram, school, password, ref } = await req.json();

    if (!fullName || !nickname || !instagram || !school || !password) {
      return NextResponse.json({ error: "لازم تملى كل الخانات" }, { status: 400 });
    }
    if (fullName.trim().split(/\s+/).length < 3) {
      return NextResponse.json(
        { error: "اكتب الاسم ثلاثي (ثلاث كلمات على الأقل)" },
        { status: 400 }
      );
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
    if (password.length < 6) {
      return NextResponse.json(
        { error: "الباسورد لازم يكون 6 حروف/أرقام على الأقل" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "اللقب ده متسجل قبل كده" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = await generateUniqueReferralCode(supabase);

    // لو فيه كود دعوة اتبعت، دور على صاحبه؛ لو مش موجود أو غلط سجل عادي من غير أي خطأ
    let referrer: { id: string; coins: number } | null = null;
    if (ref && typeof ref === "string" && ref.trim()) {
      const { data: referrerRow } = await supabase
        .from("users")
        .select("id, coins")
        .eq("referral_code", ref.trim().toUpperCase())
        .maybeSingle();
      if (referrerRow) referrer = referrerRow;
    }

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        instagram_username: instagramUsername,
        school,
        password_hash: passwordHash,
        referral_code: referralCode,
        coins: referrer ? 10 : 0
      })
      .select()
      .single();

    if (error || !user) {
      console.error("Registration insert failed", { code: error?.code, message: error?.message });
      return NextResponse.json({ error: registrationErrorMessage(error) }, { status: 500 });
    }

    // لو الدعوة صحيحة: هدية 10 كوينات للمُحيل، وسجل عملية الإحالة
    if (referrer) {
      await supabase
        .from("users")
        .update({ coins: (referrer.coins || 0) + 10 })
        .eq("id", referrer.id);

      await supabase.from("referrals").insert({
        referrer_id: referrer.id,
        referred_id: user.id
      });
    }

    const token = createUserSessionToken({ userId: user.id, nickname: user.nickname });

    const res = NextResponse.json({ success: true });
    res.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch (e) {
    console.error("Registration request failed", { message: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: registrationErrorMessage(e) }, { status: 500 });
  }
}
