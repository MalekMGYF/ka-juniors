import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "../../../lib/supabase";
import { createUserSessionToken, sessionCookieName } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { nickname, password } = await req.json();

    if (!nickname || !password) {
      return NextResponse.json({ error: "اكتب اللقب والباسورد" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("nickname", nickname.trim())
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "الحساب ده مش موجود" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "الباسورد غلط" }, { status: 401 });
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
  } catch {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }
}
