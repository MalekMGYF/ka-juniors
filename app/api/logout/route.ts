import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  return res;
}
