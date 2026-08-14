import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken, adminCookieName } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "الباسورد غلط" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(adminCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return res;
}
